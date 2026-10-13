import { LOCAL } from "@allonfire/config/local/addresses";

process.env.DATABASE_URL ??= LOCAL.URL.DATABASE;
