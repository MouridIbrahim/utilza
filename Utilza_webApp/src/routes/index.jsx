import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PublicLayout } from '../layouts/PublicLayout.jsx';
import { AccountLayout } from '../layouts/AccountLayout.jsx';
import { AdminLayout } from '../layouts/AdminLayout.jsx';
import { AuthGate, PublicOnlyGate } from './AuthGate.jsx';
import { AdminGate } from './AdminGate.jsx';
import { LandingPage } from '../pages/LandingPage.jsx';
import { CatalogPage } from '../pages/CatalogPage.jsx';
import { CategoryPage } from '../pages/CategoryPage.jsx';
import { LoginPage } from '../pages/LoginPage.jsx';
import { RegisterPage } from '../pages/RegisterPage.jsx';
import { AccountHomePage } from '../pages/AccountHomePage.jsx';
import { FavoritesPage } from '../pages/FavoritesPage.jsx';
import { HistoryPage } from '../pages/HistoryPage.jsx';
import { AccountPage } from '../pages/AccountPage.jsx';
import { SubscriptionPage } from '../pages/SubscriptionPage.jsx';
import { ErrorPage } from '../pages/ErrorPage.jsx';
import { Skeleton } from '../components/feedback/Skeleton.jsx';

// Heavy chunks load on demand (§37): tool workspace (registry + upload/result
// flow) and read-only admin lists. Landing/catalog/auth stay in the main chunk.
const ToolWorkspacePage = lazy(() =>
  import('../pages/ToolWorkspacePage.jsx').then((m) => ({ default: m.ToolWorkspacePage })),
);
const AdminToolsPage = lazy(() =>
  import('../pages/AdminToolsPage.jsx').then((m) => ({ default: m.AdminToolsPage })),
);
const AdminUsersPage = lazy(() =>
  import('../pages/AdminUsersPage.jsx').then((m) => ({ default: m.AdminUsersPage })),
);

function LazyFallback() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading page">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="tools" element={<CatalogPage />} />
        <Route path="tools/category/:categorySlug" element={<CategoryPage />} />
        <Route
          path="tools/:slug"
          element={
            <Suspense fallback={<LazyFallback />}>
              <ToolWorkspacePage />
            </Suspense>
          }
        />
        <Route path="401" element={<ErrorPage code="401" />} />
        <Route path="403" element={<ErrorPage code="403" />} />
        <Route path="404" element={<ErrorPage code="404" />} />
        <Route path="500" element={<ErrorPage code="500" />} />
        <Route path="offline" element={<ErrorPage code="offline" />} />
        <Route path="expired" element={<ErrorPage code="expired" />} />
      </Route>

      {/* Public-only (login/register bounce when authed) */}
      <Route element={<PublicOnlyGate />}>
        <Route element={<PublicLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>
      </Route>

      {/* Authenticated account area */}
      <Route element={<AuthGate />}>
        <Route element={<AccountLayout />}>
          <Route path="app/home" element={<AccountHomePage />} />
          <Route path="app/favorites" element={<FavoritesPage />} />
          <Route path="app/history" element={<HistoryPage />} />
          <Route path="app/account" element={<AccountPage />} />
          <Route path="app/subscription" element={<SubscriptionPage />} />
        </Route>
      </Route>

      {/* Admin (API-probed) */}
      <Route element={<AdminGate />}>
        <Route element={<AdminLayout />}>
          <Route
            path="admin/tools"
            element={
              <Suspense fallback={<LazyFallback />}>
                <AdminToolsPage />
              </Suspense>
            }
          />
          <Route
            path="admin/users"
            element={
              <Suspense fallback={<LazyFallback />}>
                <AdminUsersPage />
              </Suspense>
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<ErrorPage code="404" />} />
    </Routes>
  );
}

// Re-export for tests / future code-splitting.
export { Navigate };
