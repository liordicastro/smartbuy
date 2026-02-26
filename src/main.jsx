import React from 'react'
import ReactDOM from 'react-dom/client'
import Home from './Home.jsx'
import './index.css' // אופציונלי, אם נרצה עיצוב גלובלי בהמשך

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Home />
  </React.StrictMode>,
)