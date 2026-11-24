"use client";

import { GlobalError } from "@/features/errors/components/error-notice";
import "./globals.css";

// Next reads the global error from this file; the page itself is the App's `GlobalError`.
const GlobalErrorPage = GlobalError;

export default GlobalErrorPage;
