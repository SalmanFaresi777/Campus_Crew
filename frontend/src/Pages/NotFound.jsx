import React, { useState, useEffect } from 'react';
import Header from '../Components/Header';
import Footer from '../Components/Footer';
import Loader from "../Components/loader";
import { Link, useLocation } from 'react-router-dom';

function NotFound() {
  const { pathname } = useLocation();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column'}}>
      {loading && <Loader color={document.documentElement.getAttribute("data-theme") === "dark" ? "#ffffff" : "#000000"} />}
      <Header />
      <main style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:'2rem',textAlign:'center',gap:'1.2rem'}}>
        <h1 style={{fontSize:'4rem',margin:0}}>404</h1>
        <h2 style={{margin:'0 0 0.5rem'}}>Page Not Found</h2>
        <p style={{maxWidth:480,lineHeight:1.5}}>
          The path <code style={{background:'rgba(0,0,0,0.08)',padding:'2px 6px',borderRadius:4}}>{pathname}</code> does not exist.
          {pathname === '/create-events' && ' Did you mean /create-event ?'}
        </p>
        <div style={{display:'flex',gap:'0.75rem',flexWrap:'wrap',justifyContent:'center'}}>
          <Link to="/" className="nav-button primary"><span className="btn-txt">Home</span></Link>
          <Link to="/upcoming-events" className="nav-button"><span className="btn-txt">Events</span></Link>
          <Link to="/create-event" className="nav-button"><span className="btn-txt">Create Event</span></Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default NotFound;
