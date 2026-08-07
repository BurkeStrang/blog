import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      if (window.opener) {
        // Popup flow - send error message to parent and close
        try {
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: error
          }, window.location.origin);
          
          setTimeout(() => {
            window.close();
          }, 100);
        } catch {
          // Fallback to just closing
          window.close();
        }
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

        // Store authentication data
        localStorage.setItem('authToken', decodeURIComponent(token));
        localStorage.setItem('user', JSON.stringify(user));

        // Check if this is a popup or main window
        if (window.opener && !window.opener.closed) {
          // This is a popup - send message to parent and close
          try {
            // Send success message to parent window
          const successMessage = {
            type: 'OAUTH_SUCCESS',
            token: decodeURIComponent(token),
            user: user
          };

          window.opener.postMessage(successMessage, window.location.origin);
          window.opener.postMessage(successMessage, '*');
            
            // Close popup after sending message
            setTimeout(() => {
              window.close();
            }, 100);
          } catch (error) {
            console.error('Failed to send message to parent:', error);
            // Fallback to window.close() only
            try {
              window.close();
            } catch {
              // Force close failed, popup may remain open
            }
          }
        } else {
          // This is a redirect flow - navigate back to return location
          const returnTo = localStorage.getItem('returnTo') || '/posts';
          localStorage.removeItem('returnTo');
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
