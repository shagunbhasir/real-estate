import { Home, MapPin } from "lucide-react";

interface PropertyCardProps {
  type: "sale" | "rent";
  title: string;
  address: string;
  price: string;
  beds: number;
  baths: number;
  sqft: number;
  imageUrl: string;
}

export default function PropertyCard({
  type = "sale",
  title = "Property Title",
  address = "Property Address",
  price = "$0",
  beds = 0,
  baths = 0,
  sqft = 0,
  imageUrl = "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80",
}: PropertyCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:scale-[1.02]">
      <div className="relative h-48 w-full bg-gray-200">
        <img
          src={imageUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
        <div
          className={`absolute top-3 left-3 ${type === "sale" ? "bg-blue-600" : "bg-green-600"} text-white px-2 py-1 rounded-md text-sm font-medium`}
        >
          {type === "sale" ? "For Sale" : "For Rent"}
        </div>
      </div>
      <div className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xl font-semibold mb-1">{title}</h3>
            <div className="flex items-center text-gray-500 mb-2">
              <MapPin className="h-4 w-4 mr-1" />
              <span className="text-sm">{address}</span>
            </div>
          </div>
          <p
            className={`text-xl font-bold ${type === "sale" ? "text-blue-600" : "text-green-600"}`}
          >
            {price}
          </p>
        </div>
        <div className="flex justify-between mt-4 pt-4 border-t border-gray-100 text-sm">
          <div className="flex items-center">
            <Home className="h-4 w-4 mr-1 text-gray-400" />
            <span>{beds} beds</span>
          </div>
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
            <span>{baths} baths</span>
          </div>
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-1 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6z"
              />
            </svg>
            <span>{sqft.toLocaleString()} sqft</span>
          </div>
        </div>
      </div>
    </div>
  );
}
