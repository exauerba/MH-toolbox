import { HashRouter, Route, Routes } from 'react-router-dom'
import Styleguide from '../design/styleguide/Styleguide'
import { ThemeProvider } from './shell/theme'
import { Shell } from './shell/Shell'
import { RepositoryProvider } from '../data/RepositoryProvider'
import { HubHome } from '../features/hub/HubHome'
import { JarScreen } from '../features/tools/JarScreen'
import { TimelineScreen } from '../features/tools/TimelineScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { AboutScreen } from '../features/about/AboutScreen'

export default function AppShell() {
  return (
    <HashRouter>
      <ThemeProvider>
        <RepositoryProvider>
          <Shell>
            <Routes>
              <Route path="/" element={<HubHome />} />
              <Route path="/tools/jar" element={<JarScreen />} />
              <Route path="/tools/timeline" element={<TimelineScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/about" element={<AboutScreen />} />
              {/* WP3 sanctioned addition: design styleguide, not linked from any nav */}
              <Route path="/styleguide" element={<Styleguide />} />
              {/* No dead ends — anything unknown lands back on the hub */}
              <Route path="*" element={<HubHome />} />
            </Routes>
          </Shell>
        </RepositoryProvider>
      </ThemeProvider>
    </HashRouter>
  )
}
