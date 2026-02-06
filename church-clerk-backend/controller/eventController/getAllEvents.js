import Event from "../../models/eventModel.js";

const getScopedChurchId = (req) => {
  if (req.user?.role === "superadmin" || req.user?.role === "supportadmin") {
    return null;
  }
  return req.activeChurch?._id || req.user?.church || null;
};

const buildEventQuery = ({
  status,
  churchId,
  search,
  category,
  department,
  group,
  cell,
  month,
  year
}) => {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(todayStart.getDate() + 1);

  const query = {};
  if (churchId) query.church = churchId;

  query.$and = query.$and || [];

  const normalizedStatus = ["upcoming", "ongoing", "past"].includes(status)
    ? status
    : "upcoming";

  if (normalizedStatus === "upcoming") {
    query.$and.push({ dateFrom: { $gte: tomorrowStart } });
  }

  if (normalizedStatus === "ongoing") {
    query.$and.push({
      $or: [
        {
          dateFrom: { $gte: todayStart, $lt: tomorrowStart },
          dateTo: { $exists: false }
        },
        {
          dateFrom: { $lte: todayStart },
          dateTo: { $gte: todayStart }
        }
      ]
    });
  }

  if (normalizedStatus === "past") {
    query.$and.push({
      $or: [
        {
          dateTo: { $exists: false },
          dateFrom: { $lt: todayStart }
        },
        {
          dateTo: { $lt: todayStart }
        }
      ]
    });
  }

  if (search) {
    const regex = new RegExp(search, "i");
    query.$and.push({
      $or: [
        { title: regex },
        { description: regex },
        { venue: regex }
      ]
    });
  }

  if (category) query.category = category;
  if (department) query.department = department;
  if (group) query.group = group;
  if (cell) query.cell = cell;

  if (month && year) {
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);
    if (!Number.isNaN(monthNum) && !Number.isNaN(yearNum)) {
      const start = new Date(yearNum, monthNum - 1, 1);
      const end = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

      if (normalizedStatus === "ongoing") {
        query.$and.push({
          $or: [
            { dateFrom: { $gte: start, $lte: end } },
            { dateTo: { $gte: start, $lte: end } }
          ]
        });
      } else if (normalizedStatus === "past") {
        query.$and.push({
          $or: [
            { dateTo: { $gte: start, $lte: end } },
            {
              dateTo: { $exists: false },
              dateFrom: { $gte: start, $lte: end }
            }
          ]
        });
      } else {
        query.$and.push({ dateFrom: { $gte: start, $lte: end } });
      }
    }
  }

  if (!query.$and.length) {
    delete query.$and;
  }

  return query;
};

const getEvents = async (req, res) => {
  try {
    const {
      status = "upcoming",
      page = 1,
      limit = 10,
      search = "",
      category,
      department,
      group,
      cell,
      month,
      year
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 10);
    const skip = (pageNum - 1) * limitNum;

    const churchId = getScopedChurchId(req);

    const query = buildEventQuery({
      status,
      churchId,
      search,
      category,
      department,
      group,
      cell,
      month,
      year
    });

    const sort = status === "past" ? { dateTo: -1, dateFrom: -1 } : { dateFrom: 1 };

    const events = await Event.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalEvents = await Event.countDocuments(query);

    if (!events || events.length === 0) {
      return res.status(200).json({
        message: "No events found.",
        pagination: {
          totalResult: 0,
          totalPages: 0,
          currentPage: pageNum,
          hasPrev: false,
          hasNext: false,
          prevPage: null,
          nextPage: null,
        },
        count: 0,
        events: [],
      });
    }

    const totalPages = Math.ceil(totalEvents / limitNum);

    const pagination = {
      totalResult: totalEvents,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    return res.status(200).json({
      message: "Events fetched successfully",
      pagination,
      count: events.length,
      events
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch events",
      error: error.message
    });
  }
};

const getEventStats = async (req, res) => {
  try {
    const {
      search = "",
      category,
      department,
      group,
      cell,
      month,
      year
    } = req.query;

    const churchId = getScopedChurchId(req);

    const [upcomingEvents, ongoingEvents, pastEvents] = await Promise.all([
      Event.countDocuments(buildEventQuery({ status: "upcoming", churchId, search, category, department, group, cell, month, year })),
      Event.countDocuments(buildEventQuery({ status: "ongoing", churchId, search, category, department, group, cell, month, year })),
      Event.countDocuments(buildEventQuery({ status: "past", churchId, search, category, department, group, cell, month, year }))
    ]);

    return res.status(200).json({
      message: "Event stats fetched successfully",
      stats: {
        upcomingEvents,
        ongoingEvents,
        pastEvents
      }
    });
  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch event stats",
      error: error.message
    });
  }
};


const getUpcomingEvents = async (req, res) => {
   try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      department,
      group,
      cell,
      month,
      year
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const query = {
      dateFrom: { $gt: today }
    };

    // Church scoping
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch?._id || req.user.church;
    }

    // Search
    if (search) {
      const regex = new RegExp(search, "i");
      query.$or = [
        { title: regex },
        { description: regex },
        { venue: regex }
      ];
    }

    // Filters
    if (category) query.category = category;
    if (department) query.department = department;
    if (group) query.group = group;
    if (cell) query.cell = cell;

    // Month + Year filter
    if (month && year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  query.dateFrom = { $gte: start, $lte: end };
  }


    const events = await Event.find(query)
      .sort({ dateFrom: 1 }) // nearest upcoming first
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalEvents = await Event.countDocuments(query);

           // IF NO RESULTS
        if (!events || events.length === 0) {
          return res.status(200).json({
            message: "No events found.",
            pagination: {
              totalResult: 0,
              totalPages: 0,
              currentPage: pageNum,
              hasPrev: false,
              hasNext: false,
              prevPage: null,
              nextPage: null,
            },
            count: 0,
            events: [],
          });
        }

         // PAGINATION DETAILS
    const totalPages = Math.ceil(totalEvents / limitNum);

    const pagination = {
      totalResult: totalEvents,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    return res.status(200).json({
      message: "Upcoming events fetched successfully",
      pagination,
      count: events.length,
      events
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch upcoming events",
      error: error.message
    });
  }
};





// GET ONGOING EVENTS
const getOngoingEvents = async (req, res) => {
   try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      department,
      group,
      cell,
      month,
      year
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    // Base ongoing logic
    let query = {
      $or: [
        // Single-day event (no dateTo) → today === dateFrom
        {
          dateFrom: { $gte: today, $lt: tomorrow },
          dateTo: { $exists: false }
        },

        // Multi-day event → today between dateFrom & dateTo (inclusive)
        {
          dateFrom: { $lte: today },
          dateTo: { $gte: today }
        }
      ]
    };

// Church scope
if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
  query.church = req.activeChurch?._id || req.user.church;
}

    // Search
   if (search) {
  const regex = new RegExp(search, "i");
  query.$and = query.$and || [];
  query.$and.push({
    $or: [
      { title: regex },
      { description: regex },
      { venue: regex }
    ]
  });
}


    // Filters
    if (category) query.category = category;
    if (department) query.department = department;
    if (group) query.group = group;
    if (cell) query.cell = cell;

    // Month + Year filter
   if (month && year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  query.$and = query.$and || [];
  query.$and.push({
    $or: [
      { dateFrom: { $gte: start, $lte: end } },
      { dateTo: { $gte: start, $lte: end } }
    ]
  });
}



    const events = await Event.find(query)
      .sort({ dateFrom: 1 }) // nearest upcoming first
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalEvents = await Event.countDocuments(query);

           // IF NO RESULTS
        if (!events || events.length === 0) {
          return res.status(200).json({
            message: "No ongoing events found.",
            pagination: {
              totalResult: 0,
              totalPages: 0,
              currentPage: pageNum,
              hasPrev: false,
              hasNext: false,
              prevPage: null,
              nextPage: null,
            },
            count: 0,
            events: [],
          });
        }

         // PAGINATION DETAILS
    const totalPages = Math.ceil(totalEvents / limitNum);

    const pagination = {
      totalResult: totalEvents,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    return res.status(200).json({
      message: "Ongoing events fetched successfully",
      pagination,
      count: events.length,
      events
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch ongoing events",
      error: error.message
    });
  }
};



// GET PAST EVENTS
const getPastEvents = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      department,
      group,
      cell,
      month,
      year
    } = req.query;

    const today = new Date();
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, parseInt(limit));
    const skip = (pageNum - 1) * limitNum;

today.setHours(0, 0, 0, 0);

let query = {
  $or: [
    // Single-day events (no dateTo)
    {
      dateTo: { $exists: false },
      dateFrom: { $lt: today }
    },

    // Multi-day events → ended
    {
      dateTo: { $lt: today }
    }
  ]
};


    // Church scoping
    if (req.user.role !== "superadmin" && req.user.role !== "supportadmin") {
      query.church = req.activeChurch?._id || req.user.church;
    }

    // Search
    if (search) {
  const regex = new RegExp(search, "i");
  query.$and = query.$and || [];
  query.$and.push({
    $or: [
      { title: regex },
      { description: regex },
      { venue: regex }
    ]
  });
}

    // Filters
    if (category) query.category = category;
    if (department) query.department = department;
    if (group) query.group = group;
    if (cell) query.cell = cell;

    // Month + Year filter
    if (month && year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  query.$and = query.$and || [];
  query.$and.push({
    $or: [
      { dateTo: { $gte: start, $lte: end } },
      {
        dateTo: { $exists: false },
        dateFrom: { $gte: start, $lte: end }
      }
    ]
  });
}



    const events = await Event.find(query)
      .sort({ dateTo: -1 }) // most recent past first
      .skip(skip)
      .limit(limitNum)
      .lean();

    const totalEvents = await Event.countDocuments(query);

       // IF NO RESULTS
        if (!events || events.length === 0) {
          return res.status(200).json({
            message: "No events found.",
            pagination: {
              totalResult: 0,
              totalPages: 0,
              currentPage: pageNum,
              hasPrev: false,
              hasNext: false,
              prevPage: null,
              nextPage: null,
            },
            count: 0,
            events: [],
          });
        }

         // PAGINATION DETAILS
    const totalPages = Math.ceil(totalEvents / limitNum);

    const pagination = {
      totalResult: totalEvents,
      totalPages,
      currentPage: pageNum,
      hasPrev: pageNum > 1,
      hasNext: pageNum < totalPages,
      prevPage: pageNum > 1 ? pageNum - 1 : null,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
    };

    return res.status(200).json({
      message: "Past events fetched successfully",
      pagination,
      count: events.length,
      events
    });

  } catch (error) {
    return res.status(500).json({
      message: "Failed to fetch past events",
      error: error.message
    });
  }
};



export {getEvents, getEventStats, getUpcomingEvents, getOngoingEvents, getPastEvents};

