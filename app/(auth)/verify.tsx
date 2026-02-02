import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function VerifyScreen() {
  // Session creation from the magic link URL is handled by the
  // deep link listener in _layout.tsx (createSessionFromUrl).
  // The AuthGuard will redirect once the session is set.
  return <LoadingSpinner message="Signing you in..." />;
}
