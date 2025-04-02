import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function FeaturesSection() {
  return (
    <section className="py-20 bg-[#f5f5f7] text-center">
      <h2 className="text-5xl font-semibold tracking-tight mb-1">
        Key Features
      </h2>
      <h3 className="text-2xl font-medium text-gray-500 mb-4">
        Everything you need for hassle-free property transactions
      </h3>
      <div className="flex justify-center space-x-6 text-xl text-blue-600">
        <Link to="/" className="flex items-center hover:underline">
          Explore features <ChevronRight className="h-4 w-4" />
        </Link>
        <Link to="/" className="flex items-center hover:underline">
          How it works <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="mt-8 max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
          <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h4 className="text-xl font-medium mb-2">Zero Brokerage Fees</h4>
          <p className="text-gray-500">
            Save thousands on your property transactions with our
            commission-free marketplace.
          </p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
          <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-purple-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <h4 className="text-xl font-medium mb-2">Map-Based Search</h4>
          <p className="text-gray-500">
            Find properties in your desired location with our interactive map
            and advanced filters.
          </p>
        </div>
        <div className="bg-white p-8 rounded-2xl shadow-sm text-left">
          <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h4 className="text-xl font-medium mb-2">Real-Time Chat</h4>
          <p className="text-gray-500">
            Connect directly with property owners or buyers through our secure
            messaging system.
          </p>
        </div>
      </div>
    </section>
  );
}
