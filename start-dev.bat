@echo off
echo Starting the Next.js server...

REM Install dependencies
npm install

REM Open the default browser to localhost:3000
start http://localhost:3000

REM Start the Next.js development server
npm run dev

pause
