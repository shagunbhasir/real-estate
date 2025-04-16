import { useState, useCallback, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker } from "@react-google-maps/api";

interface MapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id?: string | number;
    position: { lat: number; lng: number };
    label?: string;
    title?: string;
  }>;
  onMapLoad?: (map: google.maps.Map) => void;
  height?: string;
}

const defaultCenter = { lat: 20.5937, lng: 78.9629 }; // Center of India
const defaultZoom = 5;

export default function GoogleMapComponent({
  center = defaultCenter,
  zoom = defaultZoom,
  markers = [],
  onMapLoad,
  height = "400px",
}: MapProps) {
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: ["places"],
  });

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      setMap(map);
      if (onMapLoad) onMapLoad(map);
    },
    [onMapLoad],
  );

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  // Update map center and zoom when props change
  useEffect(() => {
    if (map) {
      map.panTo(center);
      map.setZoom(zoom);
    }
  }, [map, center, zoom]);

  if (loadError) {
    return (
      <div
        className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative"
        role="alert"
      >
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline">
          {" "}
          Failed to load Google Maps API. Please check your API key.
        </span>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center" style={{ height }}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="w-full" style={{ height }}>
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
          zoomControl: true,
        }}
      >
        {markers.map((marker, index) => (
          <Marker
            key={marker.id || index}
            position={marker.position}
            label={marker.label}
            title={marker.title}
          />
        ))}
      </GoogleMap>
    </div>
  );
}
