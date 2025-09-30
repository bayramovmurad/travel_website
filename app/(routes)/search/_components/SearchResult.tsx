"use client";

import { useSearchParams } from "next/navigation";

const SearchResult = () => {
  const params = useSearchParams();

  const destination = params.get("destination");
  const activity = params.get("activity");
  const duration = params.get("duration");
  const price = params.get("price");

  return (
    <div>
      <p>
        <strong>Destination:</strong> {destination || "Not specified"}
      </p>
      <p>
        <strong>Activity:</strong> {activity || "Not specified"}
      </p>
      <p>
        <strong>Duration:</strong> {duration || "Not specified"}
      </p>
      <p>
        <strong>Price:</strong> {price || "Not specified"}
      </p>
    </div>
  );
};
export default SearchResult;
