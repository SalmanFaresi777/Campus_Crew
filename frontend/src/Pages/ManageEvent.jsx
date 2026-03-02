import React, { useState, useEffect } from 'react';
import Loader from "../Components/loader";

function ManageEvent() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <h1>Manage Events Page</h1>
    </div>
  );
}

export default ManageEvent;
