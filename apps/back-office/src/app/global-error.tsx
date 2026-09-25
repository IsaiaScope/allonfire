"use client";

const GlobalError = ({ retry }: { retry: () => void }) => (
  <html lang="en">
    <body>
      <main>
        <h1>Something went wrong</h1>
        <button onClick={retry} type="button">
          Try again
        </button>
      </main>
    </body>
  </html>
);

export default GlobalError;
