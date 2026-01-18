import mongoose from "mongoose"
import bcrypt from "bcrypt"

const userSchema = new mongoose.Schema({

    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true

    },
    phoneNumber: {
        type: String,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 8,
        select: false
    },
    role: {
        type: String,
        enum: ["superadmin", "supportadmin", "churchadmin", "associateadmin", "secretary", "financialofficer", "leader"],
        default: "churchadmin"
    },
    
    church: {
  type: mongoose.Schema.Types.ObjectId,
  ref: "Church",
    required: function () {
    // Temporarily allow null during registration
    return false; // validation will be done manually in controller after onboarding
  }
},

}, {timestamps: true});



//hash password before saving either new or updated
userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) {
        return next();
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

//hash updated password before saving if use findByIdAndUpdate
userSchema.pre("findOneAndUpdate", async function(next) {
    const update = this.getUpdate();
    if(!update) {
        return next();
    }

    if(update.password) {
    const salt = await bcrypt.genSalt(10);
    update.password = await bcrypt.hash(update.password, salt);
this.setUpdate(update);   
 }
    next();
});


//compare plain text password with hashed password
userSchema.methods.comparePassword = async function(plainPassword) {
    const isMatch = await bcrypt.compare(plainPassword, this.password);
    return isMatch;
}

export default mongoose.model("User", userSchema);