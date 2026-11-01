# Hotel API

Express and Prisma API using PostgreSQL.

## Setup

From this directory, create the `alderhouse` PostgreSQL database, set `DATABASE_URL` in `.env`, then install packages, run migrations, and seed it:

```sh
npm install
npm run db:setup
npm run dev
```

The API listens on `http://localhost:4000`. The default connection template targets a local PostgreSQL instance at `localhost:5432`.

The seed creates the configured menu items and rooms and resets the admin account on each run. Set `ADMIN_EMAIL` and a unique `ADMIN_PASSWORD` of at least 12 characters before running it; seeding fails if either value is missing or the password is too short. Keep real credentials in a local `.env` or deployment secret store, never in source control. Run `npm run db:seed` from `backend` to apply the seed. Sign-in email matching is case-insensitive, and the admin password is stored as a bcrypt hash. Food orders and room bookings use a fixed tax rate of `0.0025` (0.25%); `ORDER_TAX_RATE` is no longer used. Change the sample JWT secret before deployment.

## API

- `POST /api/auth/signup` and `POST /api/auth/signin` return `{ user, token }`.
- `POST /api/auth/logout` is stateless; discard the bearer token on the client.
- `GET /api/foods` and `GET /api/foods/:id` are public. Add `?category=Breakfast`, `?category=Lunch`, or `?category=Dinner` to return only exact category/title matches. `POST`, `PUT /:id`, and `DELETE /:id` require an admin bearer token.
- `GET /api/rooms` and `GET /api/rooms/:id` are public. Add `checkIn=YYYY-MM-DD&checkOut=YYYY-MM-DD` to `/api/rooms` for date availability. `POST`, `PUT /:id`, and `DELETE /:id` require an admin bearer token.
- `POST /api/messages` is public. `GET /api/messages` and `DELETE /api/messages/:id` require an admin bearer token.
- `GET /api/users` requires an admin bearer token and returns registered user profiles without password hashes.
- `GET /api/admin/stats` requires an admin bearer token and returns user, order, booking, and non-cancelled order/booking revenue totals. `DELETE /api/admin/users/:id` removes the user and their associated order and booking history; deleting your own account or the last administrator is rejected.
- `GET /api/admin/activity` and `GET /api/admin/page-views` require an admin bearer token. Activity includes successful website mutations; page-view details identify signed-in visitors and label guests `No client`.
- `GET /api/admin/analytics?range=month&date=YYYY-MM-DD` requires an admin bearer token and reports sales, room bookings, best sellers, best day, page views, visitor/page breakdowns, and up to 20 recent transactions from Prisma data. Supported ranges are `day`, `week`, `month`, and `year`; each report is bounded to the selected UTC period.
- `DELETE /api/admin/orders/:id` requires an admin bearer token and can remove orders regardless of status.
- `DELETE /api/admin/bookings/:id` requires an admin bearer token and permanently removes the specified room booking.
- `POST /api/analytics/page-views` records a page path and, when available, the authenticated visitor identity.
- `POST /api/orders` requires a user bearer token and accepts delivery type, customer/address/phone details, `{ items: [{ foodId, quantity }] }`, and optional notes. The server validates availability and calculates subtotal, tax, and total.
- `GET /api/orders/my` returns the signed-in user's order history. Admins can `GET /api/orders` and `PATCH /api/orders/:id/status` for all orders and delivery status changes. Customers can update their own receipt confirmation via `PATCH /api/orders/:id/confirmation`.
- `POST /api/bookings` reserves an available room for a date range. `GET /api/bookings/my` returns the signed-in user's bookings with room and guest details; admins can `GET /api/bookings` and update a booking via `PATCH /api/bookings/:id/status`. Customers can confirm their room delivery via `PATCH /api/bookings/:id/confirmation`.
- `GET /api/health` is a health check.
- `GET /api/config` is public and returns the fixed 0.25% tax rate used by food checkout and room booking.

Send protected requests with `Authorization: Bearer <token>`. New signups always receive the `USER` role; only the seeded administrator has admin access by default.