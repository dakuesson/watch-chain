import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
} from "react-router-dom";
import LandingPage from "./views/LandingPage";
import MintPage from "./views/MintPage";

const router = createBrowserRouter(
  createRoutesFromElements([
    <Route path="/" element={<LandingPage />}>
      <Route path="/mint" element={<MintPage />} />,
    </Route>,
  ])
);

export default router;
