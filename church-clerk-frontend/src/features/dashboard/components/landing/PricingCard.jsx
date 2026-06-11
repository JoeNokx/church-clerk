import React from "react";
import { Link } from "react-router-dom";

function PricingCard({ name, price, features, featured }) {
  return (
    <div
      className={
        featured
          ? "bg-white rounded-2xl shadow-md ring-2 ring-blue-900 p-6 flex flex-col"
          : "bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6 flex flex-col"
      }
    >
      <div className="flex items-start justify-between">
        <h3 className="font-semibold text-gray-900 text-lg">{name}</h3>
        {featured && (
          <span className="font-semibold text-blue-900 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full text-xs">
            Most Popular
          </span>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-end gap-2">
          <span className="font-semibold text-gray-900 md:text-3xl lg:text-4xl text-xl md:text-2xl">{price}</span>
          <span className="text-gray-500 text-sm">/ month</span>
        </div>
      </div>

      <ul className="mt-6 space-y-2 text-gray-600 text-sm">
        {features.map((f) => (
          <li key={f} className="flex gap-2">
            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-900 flex-shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Link
          to="/register"
          className={
            featured
              ? "w-full inline-flex justify-center items-center rounded-lg bg-blue-900 text-white text-sm font-semibold px-4 py-2.5 shadow-sm hover:bg-blue-800"
              : "w-full inline-flex justify-center items-center rounded-lg border border-blue-900 text-blue-900 text-sm font-semibold px-4 py-2.5 hover:bg-blue-50"
          }
        >
          Get Started
        </Link>
      </div>
    </div>
  );
}

export default PricingCard;
