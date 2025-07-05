import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    console.log('OAuth callback loaded');
    
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const error = searchParams.get('error');

    console.log('OAuth callback params:', { token: !!token, user: !!userParam, error });

    if (error) {
      console.log('OAuth error detected:', error);
      if (window.opener) {
        // Popup flow - close popup
        window.close();
      } else {
        // Redirect flow - go back to posts
        navigate('/posts', { replace: true });
      }
      return;
    }

    if (token && userParam) {
      try {
        // Decode base64 user data and parse JSON
        const decodedUserJSON = atob(userParam);
        const user = JSON.parse(decodedUserJSON);
        console.log('Parsed user data:', user);
        
        // Store authentication data
        localStorage.setItem('authToken', decodeURIComponent(token));
        localStorage.setItem('user', JSON.stringify(user));
        
        console.log('Authentication successful');
        
        // Check if this is a popup or main window
        if (window.opener) {
          // This is a popup - close it, parent will detect and update state
          console.log('Closing popup');
          window.close();
        } else {
          // This is a redirect flow - navigate back to return location
          const returnTo = localStorage.getItem('returnTo') || '/posts';
          localStorage.removeItem('returnTo');
          console.log('Redirecting to:', returnTo);
          navigate(returnTo, { replace: true });
        }
        
      } catch (err) {
        console.error('Failed to parse user data:', err);
        if (window.opener) {
          window.close();
        } else {
          navigate('/posts', { replace: true });
        }
      }
    } else {
      // Missing required parameters
      console.log('Missing token or user data');
      if (window.opener) {
        window.close();
      } else {
        navigate('/posts', { replace: true });
      }
    }
  }, [searchParams, navigate]);

  // Don't render anything - just process and redirect immediately
  return null;
};