# utilza

EverydayTools Flutter client for `utilza_backend` (`/api/v1`).

## Run normally

1. Start the backend (from `E:\Utilza\Utilza_backend`):
   ```sh
   npm run dev
   ```
   It serves `http://<pc-lan-ip>:4000` (`PORT` in its `.env`).
   Check: `http://<pc-lan-ip>:4000/health` → `{"status":"ok",...}`.

2. Run the app (from `E:\Utilza\Utilza_mobile\utilza`):
   ```sh
   flutter run
   ```
   No flags needed: the default `API_BASE_URL` is the PC's LAN address
   so a physical phone on the same Wi-Fi reaches the backend.
   (`localhost` on a phone means the phone itself.)

3. Optional override (emulator, staging, production):
   ```sh
   flutter run --dart-define=API_BASE_URL=https://<host>/api/v1
   ```

If the PC's Wi-Fi reconnects and its IP changes, update the
`defaultValue` in `lib/core/constants/api_constants.dart`.
