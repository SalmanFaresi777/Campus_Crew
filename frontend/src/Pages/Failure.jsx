import React, { useState, useEffect } from "react";
import Loader from "../Components/loader";

function Failure() {
  const [loading, setLoading] = useState(true);
  const searchData = new URLSearchParams(window.location.search);
  const message = searchData.get("message");

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      Payment failure {message}
    </div>
  );
}

export default Failure;
