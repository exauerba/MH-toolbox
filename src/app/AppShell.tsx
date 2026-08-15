import { HashRouter, Route, Routes } from 'react-router-dom'

export default function AppShell() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<p className="p-4">steady — coming together</p>} />
      </Routes>
    </HashRouter>
  )
}
