import { HashRouter, Route, Routes } from 'react-router-dom'
import Styleguide from '../design/styleguide/Styleguide'

export default function AppShell() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<p className="p-4">steady — coming together</p>} />
        {/* WP3 sanctioned addition: design styleguide, not linked from any nav */}
        <Route path="/styleguide" element={<Styleguide />} />
      </Routes>
    </HashRouter>
  )
}
