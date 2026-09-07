import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUser, FiLock, FiMail } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/construction-logo-design.jpg';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (setter) => (e) => {
    setError('');
    setter(e.target.value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    let result;
    if (isLogin) {
      result = await login(username, password);
    } else {
      result = await signup(username, password, email);
    }
    
    setIsSubmitting(false);
    
    if (result.success) {
      navigate('/work-center');
    } else {
      setError(result.error);
    }
  };

  return (
    <div 
      className="d-flex align-items-center min-vh-100"
      style={{
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#0a192f',
        fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
    >
      {/* Video Background with subtle parallax/scale animation */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="login-video-bg"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          minWidth: '100vw',
          minHeight: '100vh',
          width: 'auto',
          height: 'auto',
          transform: 'translate(-50%, -50%) scale(1.05)',
          objectFit: 'cover',
          zIndex: 0,
        }}
      >
        <source src="/assets/Create_a_premium_cinematic_.mp4" type="video/mp4" />
      </video>

      {/* Overlays removed to keep video bright and natural */}

      <div 
        className="w-100 position-relative login-layout-wrapper" 
        style={{ zIndex: 3 }}
      >
        {/* Left-side Branding Section */}
        <section className="login-branding">
          <h1 className="login-branding-heading">
            Plan. Procure. Build.<br className="d-none d-md-inline" /> Manage.
          </h1>
          <p className="login-branding-description">
            A unified ERP solution for smarter construction project management
            and streamlined business operations.
          </p>
        </section>
        <div 
          className="card border-0 p-4 p-md-5 login-form-container"
          style={{
            width: '100%',
            maxWidth: '420px',
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '20px',
            boxShadow: '0 30px 60px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(255, 255, 255, 0.05)',
            transform: 'translateY(0)',
            transition: 'transform 0.4s ease'
          }}
        >
        <div className="text-center mb-4">
          <div 
            className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3 login-icon-container"
            style={{
              width: '80px', height: '80px', 
              background: `url(${logo}) center/cover no-repeat`,
              border: '2px solid rgba(255,255,255,0.15)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
            }}
          />
          <h2 className="fw-bolder text-white mb-2" style={{ letterSpacing: '-0.5px', fontSize: '1.75rem' }}>
            {isLogin ? 'Construction ERP' : 'Create Account'}
          </h2>
          <p style={{ color: '#cbd5e1', fontSize: '0.95rem', fontWeight: '400' }}>
            {isLogin ? 'Sign in to access your dashboard' : 'Sign up to get started'}
          </p>
        </div>

        {error && (
          <div className="alert alert-danger text-center py-2 mb-4 border-0 rounded-3" role="alert" style={{ fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <div className="input-group login-input-group">
              <span 
                className="input-group-text border-0"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}
              >
                <FiUser />
              </span>
              <input 
                type="text" 
                className="form-control border-0 text-white shadow-none login-input" 
                placeholder="Username" 
                required
                value={username}
                onChange={handleInputChange(setUsername)}
                style={{ background: 'rgba(255,255,255,0.05)', padding: '14px 15px', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', fontSize: '1rem' }}
              />
            </div>
          </div>
          
          {!isLogin && (
            <div className="mb-4">
              <div className="input-group login-input-group">
                <span 
                  className="input-group-text border-0"
                  style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}
                >
                  <FiMail />
                </span>
                <input 
                  type="email" 
                  className="form-control border-0 text-white shadow-none login-input" 
                  placeholder="Email Address" 
                  required
                  value={email}
                  onChange={handleInputChange(setEmail)}
                  style={{ background: 'rgba(255,255,255,0.05)', padding: '14px 15px', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', fontSize: '1rem' }}
                />
              </div>
            </div>
          )}

          <div className="mb-4">
            <div className="input-group login-input-group">
              <span 
                className="input-group-text border-0"
                style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8', borderTopLeftRadius: '10px', borderBottomLeftRadius: '10px' }}
              >
                <FiLock />
              </span>
              <input 
                type="password" 
                className="form-control border-0 text-white shadow-none login-input" 
                placeholder="Password" 
                required
                value={password}
                onChange={handleInputChange(setPassword)}
                style={{ background: 'rgba(255,255,255,0.05)', padding: '14px 15px', borderTopRightRadius: '10px', borderBottomRightRadius: '10px', fontSize: '1rem' }}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn w-100 fw-bold shadow-sm login-btn"
            disabled={isSubmitting}
            style={{
              background: '#f8fafc',
              color: '#0f172a',
              padding: '14px',
              borderRadius: '10px',
              letterSpacing: '0.3px',
              fontSize: '1.05rem',
              transition: 'all 0.3s ease'
            }}
          >
            {isSubmitting ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="text-center mt-4">
          <button 
            type="button" 
            className="btn btn-link text-decoration-none login-toggle-btn"
            style={{ color: '#94a3b8', fontSize: '0.9rem', transition: 'color 0.2s' }}
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
          >
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        /* ── Layout Wrapper ── */
        .login-layout-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          padding: 2rem 1.5rem;
          min-height: 100vh;
          box-sizing: border-box;
        }

        /* ── Left Branding Section ── */
        .login-branding {
          display: none; /* hidden on mobile by default */
          flex: 1 1 0;
          max-width: 540px;
          padding: 0 1rem;
        }

        .login-branding-heading {
          font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: clamp(38px, 4.2vw, 58px);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.8px;
          color: #ffffff;
          margin: 0 0 24px 0;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
        }

        .login-branding-description {
          font-family: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          font-size: clamp(16px, 1.25vw, 19px);
          font-weight: 500;
          line-height: 1.6;
          color: #cbd5e1;
          max-width: 500px;
          margin: 0;
          text-shadow: 0 1px 6px rgba(0, 0, 0, 0.1);
        }

        /* ── Login Card Container ── */
        .login-form-container {
          flex-shrink: 0;
        }

        /* ── Desktop: show branding side-by-side ── */
        @media (min-width: 992px) {
          .login-layout-wrapper {
            justify-content: center;
            padding: 2rem 4rem;
            gap: 4rem;
          }
          .login-branding {
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
        }

        /* ── Tablet: show branding, reduced sizing ── */
        @media (min-width: 768px) and (max-width: 991px) {
          .login-layout-wrapper {
            flex-direction: column;
            align-items: center;
            gap: 2.5rem;
            padding: 2.5rem 2rem;
          }
          .login-branding {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            max-width: 540px;
          }
          .login-branding-heading {
            font-size: 38px;
            margin-bottom: 20px;
          }
          .login-branding-description {
            font-size: 16.5px;
          }
        }

        /* ── Mobile: stacked layout ── */
        @media (max-width: 767px) {
          .login-layout-wrapper {
            flex-direction: column;
            align-items: center;
            gap: 2rem;
            padding: 1.5rem 1rem;
          }
          .login-branding {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            max-width: 100%;
            padding: 0 0.5rem;
          }
          .login-branding-heading {
            font-size: 32px;
            margin-bottom: 20px;
          }
          .login-branding-description {
            font-size: 15.5px;
          }
        }

        /* ── Video background animation ── */
        .login-video-bg {
          animation: subtleScale 25s alternate infinite ease-in-out;
        }

        @keyframes subtleScale {
          0% { transform: translate(-50%, -50%) scale(1.05); }
          100% { transform: translate(-50%, -50%) scale(1.12); }
        }

        .login-input::placeholder {
          color: rgba(148, 163, 184, 0.7) !important;
        }

        .login-input-group {
          transition: all 0.3s ease;
          border-radius: 10px;
          border: 1px solid transparent;
        }

        .login-input-group:focus-within {
          border: 1px solid rgba(255, 255, 255, 0.25);
          box-shadow: 0 0 15px rgba(255,255,255,0.05);
        }

        .login-input:focus {
          background: rgba(255,255,255,0.08) !important;
        }

        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px rgba(255,255,255,0.15) !important;
          background: #ffffff !important;
        }

        .login-toggle-btn:hover {
          color: #f8fafc !important;
        }

        @media (max-width: 576px) {
          .login-form-container {
            padding: 2rem !important;
            margin: 0;
            backdrop-filter: blur(15px);
            -webkit-backdrop-filter: blur(15px);
          }
        }
      `}</style>
    </div>
  );
};

export default Login;

