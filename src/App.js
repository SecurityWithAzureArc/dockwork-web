import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Route, Redirect } from 'react-router-dom'

const Images = lazy(() => import('./images'))

function App() {
  return (
    <Suspense fallback="Loading...">
      <Router>
        <Route path="/images">
          <Images />
        </Route>
        <Route path="/" strict exact>
          <Redirect to="/images" />
        </Route>
      </Router>
    </Suspense>
  );
}

export default App;
