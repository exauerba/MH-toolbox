import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Chart,
  Chip,
  Icon,
  IconButton,
  Modal,
  ProgressBar,
  SegmentedControl,
  Stepper,
  Tile,
  EmptyState,
} from '../../design'
import { buildTimeOfDayConfig, buildTrendConfig, dayLabel, lastNDates, medDoseCountsByDay } from './chartData'
import { correlations, controlState, spearmanStrength, whatHelpedDelta } from './scoring'
import { removeAllBreatheData, seedSampleFortnight } from './demoData'
import type { IconName } from '../../design'
import { useRepository } from '../../data/RepositoryProvider'
import type {
  BreatheCheckin,
  BreatheCheckinInput,
  BreatheDoseLog,
  BreatheMed,
} from '../../data/types'
import { todayForResetHour } from '../../shared/day'

export function BreatheScreen() {
  const repo = useRepository()
  const navigate = useNavigate()

  // State
  const [tab, setTab] = useState<'log' | 'checkin' | 'meds' | 'viz'>('log')
  const [meds, setMeds] = useState<BreatheMed[]>([])
  const [checkins, setCheckins] = useState<BreatheCheckin[]>([])
  const [doseLogs, setDoseLogs] = useState<BreatheDoseLog[]>([])

  // Loading states
  const [loadingMeds, setLoadingMeds] = useState(true)
  const [loadingCheckins, setLoadingCheckins] = useState(true)
  const [loadingDoseLogs, setLoadingDoseLogs] = useState(true)

  // Error states
  const [errorMeds, setErrorMeds] = useState<string | null>(null)
  const [errorCheckins, setErrorCheckins] = useState<string | null>(null)
  const [errorDoseLogs, setErrorDoseLogs] = useState<string | null>(null)

  // Form states for Log Dose tab
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null)
  const [doseTime, setDoseTime] = useState<string>('')

  // Form states for Check-in tab
  const [checkinDate, setCheckinDate] = useState<string>('')
  const [peakFlow, setPeakFlow] = useState<number | null>(null)
  const [symptoms, setSymptoms] = useState<number | null>(null)
  const [sleep, setSleep] = useState<number | null>(null)
  const [activity, setActivity] = useState<number | null>(null)
  const [note, setNote] = useState<string>('')

  // Edit states
  const [, setEditingMed] = useState<BreatheMed | null>(null)

  // Form states for Add Medication
  const [newMedName, setNewMedName] = useState('')
  const [newMedType, setNewMedType] = useState<'controller' | 'reliever' | 'other'>('controller')
  const [newMedReminder, setNewMedReminder] = useState<string>('')
  const [editingCheckin, setEditingCheckin] = useState<BreatheCheckin | null>(null)

  // Modal states
  const [deleteMedId, setDeleteMedId] = useState<string | null>(null)
  const [deleteCheckinId, setDeleteCheckinId] = useState<string | null>(null)

  // Demo data states
  const [demoBusy, setDemoBusy] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadData = async () => {
      try {
        // Load medications
        setLoadingMeds(true)
        const medsData = await repo.listBreatheMeds()
        if (!cancelled) {
          setMeds(medsData)
          setLoadingMeds(false)
        }
      } catch {
        if (!cancelled) {
          setErrorMeds('Failed to load medications')
          setLoadingMeds(false)
        }
      }

      try {
        // Load check-ins
        setLoadingCheckins(true)
        const checkinsData = await repo.listBreatheCheckins()
        if (!cancelled) {
          setCheckins(checkinsData)
          setLoadingCheckins(false)
        }
      } catch {
        if (!cancelled) {
          setErrorCheckins('Failed to load check-ins')
          setLoadingCheckins(false)
        }
      }

      try {
        // Load dose logs for today
        setLoadingDoseLogs(true)
        const todayStr = todayForResetHour(0) // Assuming midnight reset
        const doseLogsData = await repo.listBreatheDoseLogs()
        // Filter for today's dose logs
        const todaysDoseLogs = doseLogsData.filter(log => log.date === todayStr)
        if (!cancelled) {
          setDoseLogs(todaysDoseLogs)
          setLoadingDoseLogs(false)
        }
      } catch {
        if (!cancelled) {
          setErrorDoseLogs('Failed to load dose logs')
          setLoadingDoseLogs(false)
        }
      }
    }

    void loadData()

    return () => {
      cancelled = true
    }
  }, [repo])

  // Initialize form states when tab changes or data loads
  useEffect(() => {
    if (meds.length > 0 && !selectedMedId) {
      setSelectedMedId(meds[0].id)
    }

    if (tab === 'checkin') {
      // Set default date to today
      setCheckinDate(todayForResetHour(0))
    }
  }, [tab, meds, selectedMedId])

  // Handlers
  const handleTabChange = (value: string) => {
    setTab(value as 'log' | 'checkin' | 'meds' | 'viz')
  }

  const handleMedSelect = (medId: string) => {
    setSelectedMedId(medId)
  }

  const handleDoseTimeChange = (time: string) => {
    setDoseTime(time)
  }

  const handleCheckinDateChange = (date: string) => {
    setCheckinDate(date)
  }

  const handlePeakFlowChange = (value: number | null) => {
    setPeakFlow(value)
  }

  const handleSymptomsChange = (value: number | null) => {
    setSymptoms(value)
  }

  const handleSleepChange = (value: number | null) => {
    setSleep(value)
  }

  const handleActivityChange = (value: number | null) => {
    setActivity(value)
  }

  const handleNoteChange = (value: string) => {
    setNote(value)
  }

  const handleLogDose = async () => {
    if (!selectedMedId) return

    try {
      const date = todayForResetHour(0) // Assuming midnight reset
      const time = doseTime || null

      await repo.addBreatheDoseLog({
        medId: selectedMedId,
        date,
        time,
      })

      // Refresh dose logs for today
      setLoadingDoseLogs(true)
      const todayStr = todayForResetHour(0)
      const doseLogsData = await repo.listBreatheDoseLogs()
      const todaysDoseLogs = doseLogsData.filter(log => log.date === todayStr)
      setDoseLogs(todaysDoseLogs)
      setLoadingDoseLogs(false)

      // Reset form
      setDoseTime('')
    } catch (err) {
      console.error('Failed to log dose:', err)
    }
  }

  const handleSaveCheckin = async () => {
    try {
      const checkinData: BreatheCheckinInput = {
        date: checkinDate,
        peakFlow,
        symptoms,
        sleep,
        activity,
        note: note.trim() || null,
      }

      if (editingCheckin) {
        await repo.saveBreatheCheckin(checkinData, editingCheckin.id)
        setEditingCheckin(null)
      } else {
        await repo.saveBreatheCheckin(checkinData)
      }

      // Refresh check-ins
      setLoadingCheckins(true)
      const updatedCheckins = await repo.listBreatheCheckins()
      setCheckins(updatedCheckins)
      setLoadingCheckins(false)

      // Reset form
      setCheckinDate(todayForResetHour(0))
      setPeakFlow(null)
      setSymptoms(null)
      setSleep(null)
      setActivity(null)
      setNote('')
    } catch (err) {
      console.error('Failed to save check-in:', err)
    }
  }

  const handleSaveMed = async () => {
    if (!newMedName.trim()) return

    try {
      await repo.saveBreatheMed({
        name: newMedName.trim(),
        medType: newMedType,
        reminderHour: newMedReminder ? Number(newMedReminder) : null,
      })

      // Refresh medications
      setLoadingMeds(true)
      const updatedMeds = await repo.listBreatheMeds()
      setMeds(updatedMeds)
      setLoadingMeds(false)

      // Reset form
      setNewMedName('')
      setNewMedType('controller')
      setNewMedReminder('')
    } catch (err) {
      console.error('Failed to save medication:', err)
    }
  }

  const handleDeleteDoseLog = async (id: string) => {
    try {
      await repo.deleteBreatheDoseLog(id)

      // Refresh today's dose logs
      setLoadingDoseLogs(true)
      const todayStr = todayForResetHour(0)
      const doseLogsData = await repo.listBreatheDoseLogs()
      const todaysDoseLogs = doseLogsData.filter(log => log.date === todayStr)
      setDoseLogs(todaysDoseLogs)
      setLoadingDoseLogs(false)
    } catch (err) {
      console.error('Failed to delete dose log:', err)
    }
  }

  const handleDeleteMed = async (id: string) => {
    try {
      await repo.deleteBreatheMed(id)
      setDeleteMedId(null)

      // Refresh medications
      setLoadingMeds(true)
      const updatedMeds = await repo.listBreatheMeds()
      setMeds(updatedMeds)
      setLoadingMeds(false)
    } catch (err) {
      console.error('Failed to delete medication:', err)
      setDeleteMedId(null)
    }
  }

  const handleDeleteCheckin = async (id: string) => {
    try {
      await repo.deleteBreatheCheckin(id)
      setDeleteCheckinId(null)

      // Refresh check-ins
      setLoadingCheckins(true)
      const updatedCheckins = await repo.listBreatheCheckins()
      setCheckins(updatedCheckins)
      setLoadingCheckins(false)
    } catch (err) {
      console.error('Failed to delete check-in:', err)
      setDeleteCheckinId(null)
    }
  }

  // Reload every breathe collection after a bulk change (demo seed / wipe).
  const refreshAll = async () => {
    setLoadingMeds(true)
    setLoadingCheckins(true)
    setLoadingDoseLogs(true)
    try {
      const [m, c, d] = await Promise.all([
        repo.listBreatheMeds(),
        repo.listBreatheCheckins(),
        repo.listBreatheDoseLogs(),
      ])
      const todayStr = todayForResetHour(0)
      setMeds(m)
      setCheckins(c)
      setDoseLogs(d.filter(log => log.date === todayStr))
    } catch (err) {
      console.error('Failed to refresh breathe data:', err)
    } finally {
      setLoadingMeds(false)
      setLoadingCheckins(false)
      setLoadingDoseLogs(false)
      setDemoBusy(false)
    }
  }

  const handleSeedSample = async () => {
    if (demoBusy) return
    setDemoBusy(true)
    try {
      await seedSampleFortnight(repo)
      await refreshAll()
    } catch (err) {
      console.error('Failed to seed sample data:', err)
      setDemoBusy(false)
    }
  }

  const handleRemoveSample = async () => {
    if (demoBusy) return
    setDemoBusy(true)
    try {
      await removeAllBreatheData(repo)
      await refreshAll()
    } catch (err) {
      console.error('Failed to remove sample data:', err)
      setDemoBusy(false)
    }
  }

  // Header
  const header = (
    <div className="flex flex-wrap items-center gap-3">
      <IconButton
        icon="arrowLeft"
        label="Back to home"
        variant="ghost"
        onClick={() => navigate('/')}
      />
      <div className="flex items-center gap-2.5">
        <Tile icon="inhaler" accent="breathe" />
        <h1 className="font-display text-3xl font-bold text-ink">Breathe</h1>
      </div>
    </div>
  )

  // Tabs
  const tabs: { value: string; label: string; icon: IconName }[] = [
    { value: 'log', label: 'Log Dose', icon: 'plus' },
    { value: 'checkin', label: 'Check-in', icon: 'check' },
    { value: 'meds', label: 'Medications', icon: 'inhaler' },
    { value: 'viz', label: 'Visualize', icon: 'sparkle' },
  ]

  // Visualization-derived data (computed once per data change)
  const dates = useMemo(() => lastNDates(14), [])
  const control = controlState(checkins, doseLogs, meds)
  const insight = whatHelpedDelta(checkins, doseLogs, meds)
  const trendConfig = useMemo(() => buildTrendConfig(checkins, dates), [checkins, dates])
  const timeOfDayConfig = useMemo(() => buildTimeOfDayConfig(doseLogs), [doseLogs])
  const corrCells = useMemo(() => correlations(checkins), [checkins])
  const adherenceByDay = useMemo(
    () => medDoseCountsByDay(meds, doseLogs, dates.slice(-7)),
    [meds, doseLogs, dates],
  )

  // Correlation strength → readable tone for the heatmap cells.
  const rhoTone = (rho: number): string => {
    const strength = spearmanStrength(rho)
    const positive = rho > 0
    if (strength === 'strong') {
      return positive ? 'bg-success-soft text-success-ink' : 'bg-overdrawn-soft text-overdrawn-ink'
    }
    if (strength === 'moderate') {
      return positive ? 'bg-breathe-100 text-ink' : 'bg-low-soft text-ink'
    }
    return 'bg-surface-muted text-ink-soft'
  }

  const hasControllerMed = meds.some((m) => m.medType === 'controller')

  return (
    <div className="flex flex-col gap-6">
      {header}

      <Card variant="raised" padding="lg" className="pixel-card flex-1">
        <SegmentedControl
          label="Sections"
          value={tab}
          onChange={handleTabChange}
          className="mb-4"
          options={tabs}
          pixel
        />

        {/* Tab Content */}
        {tab === 'log' && (
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Medication Selector */}
              <div>
                <label
                  htmlFor="breathe-dose-medication"
                  className="block text-sm font-medium text-ink mb-2"
                >
                  Medication
                </label>
                {loadingMeds ? (
                  <div data-testid="loading-medications" className="h-10 w-full rounded border-line bg-surface-muted animate-pulse">
                    <div className="h-full w-full rounded"></div>
                  </div>
                ) : errorMeds ? (
                  <div className="h-10 w-full rounded border-overdrawn-line bg-overdrawn-soft text-overdrawn-ink flex items-center px-3">
                    {errorMeds}
                  </div>
                ) : meds.length === 0 ? (
                  <div className="h-10 w-full rounded border-line bg-surface-muted flex items-center px-3 text-sm text-ink-soft">
                    No medications available
                   </div>
                 ) : (
                  <div className="relative">
                    <select
                      id="breathe-dose-medication"
                      value={selectedMedId || ''}
                      onChange={(e) => handleMedSelect(e.target.value)}
                      className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                    >
                      <option value="">Select a medication</option>
                       {meds.map(med => <option key={med.id} value={med.id}>{med.name}</option>)}

                    </select>
                  </div>
                )}
              </div>

              {/* Time Picker */}
              <div>
                <label
                  htmlFor="breathe-dose-time"
                  className="block text-sm font-medium text-ink mb-2"
                >
                  Time
                </label>
                <input
                  id="breathe-dose-time"
                  type="time"
                  value={doseTime}
                  onChange={(e) => handleDoseTimeChange(e.target.value)}
                  className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                />
              </div>
            </div>

             {/* Today's Dose Logs */}
             <div>
               <h3 className="mb-2 text-sm font-extrabold uppercase tracking-wide text-ink-soft">
                 Today's Dose Logs
               </h3>

              {loadingDoseLogs ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="h-6 w-full rounded border-line bg-surface-muted animate-pulse">
                    <div className="h-full w-full rounded"></div>
                  </div>
                </div>
              ) : errorDoseLogs ? (
                <div className="p-4 text-center text-overdrawn-ink">
                  {errorDoseLogs}
                </div>
              ) : doseLogs.length === 0 ? (
                 <p className="text-sm text-ink-soft">
                    No dose logs yet today. Log a dose to get started.
                  </p>
                ) : (
                 <ul className="divide-y divide-line">
                   {doseLogs.map((log) => (
                     <li
                       key={log.id}
                       className="flex items-center justify-between px-4 py-3"
                     >
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-3">
                           <div className="flex-shrink-0">
                             <Icon name="droplet" size={16} pixel className="text-ink-600" />
                           </div>
                           <div>
                             <p className="font-medium text-ink">{log.time ?? 'No time'}</p>
                           </div>
                         </div>
                       </div>

                       <div className="flex items-center gap-2">
                         <IconButton
                           icon="trash"
                           label={`Delete dose log`}
                           variant="ghost"
                           pixel
                            onClick={() => {
                              handleDeleteDoseLog(log.id)
                            }}
                         />
                       </div>
                     </li>
                   ))}
                 </ul>
               )}
             </div>

            <Button
              onClick={handleLogDose}
              className="w-full"
              leadingIcon={<Icon name="plus" size={18} pixel />}
            >
              Log Dose
            </Button>
          </div>
        )}

        {tab === 'checkin' && (
          <div className="space-y-4">
            {/* Check-ins List */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-ink">
                Recent Check-ins
              </h3>

              {loadingCheckins ? (
                <div data-testid="loading-checkins" className="h-96 flex items-center justify-center">
                  <div className="h-6 w-full rounded border-line bg-surface-muted animate-pulse">
                    <div className="h-full w-full rounded"></div>
                  </div>
                </div>
              ) : errorCheckins ? (
                <div className="p-4 text-center text-overdrawn-ink">
                  {errorCheckins}
                </div>
              ) : checkins.length === 0 ? (
                <>
                  <EmptyState
                    icon="check"
                    title="No check-ins yet"
                    body="Add your first check-in to start tracking your asthma, or explore with a sample fortnight"
                    action={
                      <Button
                        onClick={handleSeedSample}
                        disabled={demoBusy}
                        leadingIcon={<Icon name="sparkle" size={16} pixel />}
                      >
                        Try a sample fortnight
                      </Button>
                    }
                  />
                  <p className="mt-2 text-center text-xs text-ink-soft">
                    Sample data — you can remove it anytime.
                  </p>
                </>
              ) : (
                <div className="space-y-3">
                  {checkins
                    .slice(0, 5) // Show last 5 check-ins
                    .map((checkin) => (
                      <div
                        key={checkin.id}
                        className="flex items-center justify-between px-4 py-3 border-b divide-line"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0">
                              <Icon name="check" size={16} pixel className="text-ink-600" />
                            </div>
                            <div>
                              <p className="font-medium text-ink">
                                {new Date(checkin.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}
                              </p>
{checkin.peakFlow !== null && (
                                <p className="text-xs text-ink-soft">
                                  Peak Flow: {checkin.peakFlow} L/min
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {editingCheckin?.id === checkin.id ? (
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                onClick={() => setEditingCheckin(null)}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleSaveCheckin}
                                className="ml-3"
                              >
                                Save
                              </Button>
                               </div>
                           ) : (
                            <div className="flex gap-2">
                              <IconButton
                                icon="edit"
                                label={`Edit check-in for ${new Date(checkin.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}`}
                                variant="ghost"
                                pixel
                                onClick={() => setEditingCheckin(checkin)}
                              />
                              <IconButton
                                icon="trash"
                                label={`Delete check-in for ${new Date(checkin.date).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' })}`}
                                variant="ghost"
                                pixel
                                onClick={() => setDeleteCheckinId(checkin.id)}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Add/Edit Check-in Form */}
            <div className="border-t divide-line pt-4">
              {editingCheckin ? (
                <div className="bg-surface-muted p-4 rounded-lg">
                  <h3 className="mb-3 text-lg font-semibold text-ink">Edit Check-in</h3>
                  <form className="space-y-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Date Selector */}
                      <div>
                        <label
                          htmlFor="breathe-checkin-date"
                          className="block text-sm font-medium text-ink mb-2"
                        >
                          Date
                        </label>
                        <input
                          id="breathe-checkin-date"
                          type="date"
                          value={checkinDate}
                          onChange={(e) => handleCheckinDateChange(e.target.value)}
                          className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                        />
                      </div>

                      {/* Peak Flow */}
                      <div>
                        <label
                          htmlFor="breathe-checkin-peak"
                          className="block text-sm font-medium text-ink mb-2"
                        >
                          Peak Flow (L/min)
                        </label>
                        <input
                          id="breathe-checkin-peak"
                          type="number"
                          min={0}
                          value={peakFlow ?? ''}
                          onChange={(e) => handlePeakFlowChange(e.target.value === '' ? null : Number(e.target.value))}
                          className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                          placeholder="Optional"
                        />
                      </div>

                      {/* Sliders */}
                      <div className="space-y-4">
                        <div>
                          <span className="block text-sm font-medium text-ink mb-2">
                            Symptoms (1-5)
                          </span>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label="Symptoms"
                              value={symptoms ?? 3}
                              onChange={handleSymptomsChange}
                              step={1}
                              min={1}
                              max={5}
                              pixel
                              className="w-full"
                            />
                            <span className="w-8 text-center font-mono">{symptoms ?? 3}</span>
                          </div>
                        </div>

                        <div>
                          <span className="block text-sm font-medium text-ink mb-2">
                            Sleep (1-5)
                          </span>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label="Sleep"
                              value={sleep ?? 3}
                              onChange={handleSleepChange}
                              step={1}
                              min={1}
                              max={5}
                              pixel
                              className="w-full"
                            />
                            <span className="w-8 text-center font-mono">{sleep ?? 3}</span>
                          </div>
                        </div>

                        <div>
                          <span className="block text-sm font-medium text-ink mb-2">
                            Activity (1-5)
                          </span>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label="Activity"
                              value={activity ?? 3}
                              onChange={handleActivityChange}
                              step={1}
                              min={1}
                              max={5}
                              pixel
                              className="w-full"
                            />
                            <span className="w-8 text-center font-mono">{activity ?? 3}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Note */}
                 <div>
                   <label
                     htmlFor="breathe-checkin-note"
                     className="block text-sm font-medium text-ink mb-2"
                   >
                     Note
                   </label>
                   <textarea
                     id="breathe-checkin-note"
                     value={note}
                     onChange={(e) => handleNoteChange(e.target.value)}
                     className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                     rows={4}
                     placeholder="Optional note about your check-in"
                   />
</div>

                     <div className="flex justify-end gap-3">
                      <Button
                        variant="ghost"
                        onClick={() => setEditingCheckin(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveCheckin}
                        className="ml-3"
                      >
                        Save
                      </Button>
                    </div>
                  </form>
                 </div>
               ) : (
                 <div>
                   <h3 className="mb-3 text-lg font-semibold text-ink flex items-center gap-2">
                     <Icon name="plus" size={18} pixel className="text-ink" />
                     Add Check-in
                  </h3>
                  <form className="space-y-3">
                    <div className="grid gap-4 sm:grid-cols-2">
                      {/* Date Selector */}
                      <div>
                        <label
                          htmlFor="breathe-checkin-date"
                          className="block text-sm font-medium text-ink mb-2"
                        >
                          Date
                        </label>
                        <input
                          id="breathe-checkin-date"
                          type="date"
                          value={checkinDate}
                          onChange={(e) => handleCheckinDateChange(e.target.value)}
                          className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                        />
                      </div>

                      {/* Peak Flow */}
                      <div>
                        <label
                          htmlFor="breathe-checkin-peak"
                          className="block text-sm font-medium text-ink mb-2"
                        >
                          Peak Flow (L/min)
                        </label>
                        <input
                          id="breathe-checkin-peak"
                          type="number"
                          min={0}
                          value={peakFlow ?? ''}
                          onChange={(e) => handlePeakFlowChange(e.target.value === '' ? null : Number(e.target.value))}
                          className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                          placeholder="Optional"
                        />
                      </div>

                      {/* Sliders */}
                      <div className="space-y-4">
                        <div>
                          <span className="block text-sm font-medium text-ink mb-2">
                            Symptoms (1-5)
                          </span>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label="Symptoms"
                              value={symptoms ?? 3}
                              onChange={handleSymptomsChange}
                              step={1}
                              min={1}
                              max={5}
                              pixel
                              className="w-full"
                            />
                            <span className="w-8 text-center font-mono">{symptoms ?? 3}</span>
                          </div>
                        </div>

                        <div>
                          <span className="block text-sm font-medium text-ink mb-2">
                            Sleep (1-5)
                          </span>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label="Sleep"
                              value={sleep ?? 3}
                              onChange={handleSleepChange}
                              step={1}
                              min={1}
                              max={5}
                              pixel
                              className="w-full"
                            />
                            <span className="w-8 text-center font-mono">{sleep ?? 3}</span>
                          </div>
                        </div>

                        <div>
                          <span className="block text-sm font-medium text-ink mb-2">
                            Activity (1-5)
                          </span>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label="Activity"
                              value={activity ?? 3}
                              onChange={handleActivityChange}
                              step={1}
                              min={1}
                              max={5}
                              pixel
                              className="w-full"
                            />
                            <span className="w-8 text-center font-mono">{activity ?? 3}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Note */}
                    <div>
                      <label
                        htmlFor="breathe-checkin-note"
                        className="block text-sm font-medium text-ink mb-2"
                      >
                        Note
                      </label>
                      <textarea
                        id="breathe-checkin-note"
                        value={note}
                        onChange={(e) => handleNoteChange(e.target.value)}
                        className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                        rows={4}
                        placeholder="Optional note about your check-in"
                      />
                    </div>

                    <Button
                      onClick={handleSaveCheckin}
                        className="w-full"
                        leadingIcon={<Icon name="check" size={18} pixel />}
                      >
                        Save Check-in
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            </div>
        )}

        {tab === 'meds' && (
          <div className="space-y-4">
            {/* Add Medication Form */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-ink flex items-center gap-2">
                <Icon name="plus" size={18} pixel className="text-ink" />
                Add Medication
              </h3>
              <form className="space-y-3">
                <div>
                  <label
                    htmlFor="breathe-med-name"
                    className="block text-sm font-medium text-ink mb-1"
                  >
                    Name
                  </label>
                  <input
                    id="breathe-med-name"
                    type="text"
                    value={newMedName}
                    onChange={(e) => setNewMedName(e.target.value)}
                    className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                    placeholder="e.g. Ventolin, Fluticasone"
                  />
                </div>

                <div>
                  <label
                    htmlFor="breathe-med-type"
                    className="block text-sm font-medium text-ink mb-1"
                  >
                    Type
                  </label>
                  <select
                    id="breathe-med-type"
                    value={newMedType}
                    onChange={(e) => setNewMedType(e.target.value as 'controller' | 'reliever' | 'other')}
                    className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                  >
                    <option value="controller">Controller</option>
                    <option value="reliever">Reliever</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="breathe-med-reminder"
                    className="block text-sm font-medium text-ink mb-1"
                  >
                    Reminder Hour (0-23)
                  </label>
                  <input
                    id="breathe-med-reminder"
                    type="number"
                    min={0}
                    max={23}
                    value={newMedReminder}
                    onChange={(e) => setNewMedReminder(e.target.value)}
                    className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                    placeholder="Optional"
                  />
                </div>

                <Button
                  onClick={handleSaveMed}
                  className="w-full"
                  leadingIcon={<Icon name="plus" size={18} pixel />}
                >
                  Add Medication
                </Button>
              </form>
            </div>

            {/* Medications List */}
            <div>
              <h3 className="mb-3 text-lg font-semibold text-ink">
                Your Medications
              </h3>

              {loadingMeds ? (
                <div data-testid="loading-medications" className="h-96 flex items-center justify-center">
                  <div className="h-6 w-full rounded border-line bg-surface-muted animate-pulse">
                    <div className="h-full w-full rounded"></div>
                  </div>
                </div>
              ) : errorMeds ? (
                <div className="p-4 text-center text-overdrawn-ink">
                  {errorMeds}
                </div>
              ) : meds.length === 0 ? (
                <>
                  <EmptyState
                    icon="inhaler"
                    title="No medications yet"
                    body="Add your asthma medications to start tracking"
                    action={
                      <Button
                        onClick={handleSeedSample}
                        disabled={demoBusy}
                        leadingIcon={<Icon name="sparkle" size={16} pixel />}
                      >
                        Try a sample fortnight
                      </Button>
                    }
                  />
                  <p className="mt-2 text-center text-xs text-ink-soft">
                    Sample data — you can remove it anytime.
                  </p>
                </>
              ) : (
                <ul className="divide-y divide-line">
                  {meds.map((med) => (
                    <li
                      key={med.id}
                      className="flex items-center justify-between px-4 py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <div className="flex-shrink-0">
                            {med.medType === 'controller' && (
                              <Icon name="shield" size={16} pixel className="text-jar-600" />
                            )}
                            {med.medType === 'reliever' && (
                              <Icon name="alert" size={16} pixel className="text-overdrawn-600" />
                            )}
                            {med.medType === 'other' && (
                              <Icon name="droplet" size={16} pixel className="text-ink-600" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-ink truncate">{med.name}</p>
                            <p className="text-xs text-ink-soft">
                              {med.medType === 'controller' ? 'Controller' : med.medType === 'reliever' ? 'Reliever' : 'Other'}
                              {med.reminderHour != null ? ` · ${med.reminderHour}:00` : ''}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                          <IconButton
                            icon="edit"
                            label={`Edit ${med.name}`}
                            variant="ghost"
                            pixel
                            onClick={() => setEditingMed(med)}
                          />
                          <IconButton
                            icon="trash"
                            label={`Delete ${med.name}`}
                            variant="ghost"
                            pixel
                            onClick={() => setDeleteMedId(med.id)}
                          />
                        </div>
                    </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === 'viz' && (
          <div className="space-y-6">
            {/* Control card */}
            <section aria-labelledby="viz-control-heading">
              <h3 id="viz-control-heading" className="mb-3 text-lg font-semibold text-ink">
                Asthma control
              </h3>
              <Card variant="soft" padding="md" className="pixel-card">
                <div role="status">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-4xl font-bold text-ink">
                        {control.score}
                      </span>
                      <span className="text-sm text-ink-soft">/ 100</span>
                    </div>
                    <Chip
                      tone={
                        control.label === 'Controlled'
                          ? 'brand'
                          : control.label === 'Partly controlled'
                            ? 'low'
                            : control.label === 'Uncontrolled'
                              ? 'overdrawn'
                              : 'neutral'
                      }
                      icon={
                        <Icon
                          name={
                            control.label === 'Controlled'
                              ? 'success'
                              : control.label === 'No data'
                                ? 'info'
                                : 'alert'
                          }
                          size={14}
                          pixel
                        />
                      }
                    >
                      {control.label}
                    </Chip>
                  </div>
                  <ProgressBar
                    value={control.score}
                    max={100}
                    label="Control score"
                    valueText={`${control.score}/100`}
                    tone={
                      control.label === 'Controlled'
                        ? 'ok'
                        : control.label === 'Partly controlled'
                          ? 'low'
                          : control.label === 'Uncontrolled'
                            ? 'overdrawn'
                            : 'default'
                    }
                    className="mt-3"
                  />
                  <p className="mt-3 text-sm text-ink-soft">{control.copy}</p>
                </div>
              </Card>
            </section>

            {/* Trend chart */}
            <section aria-labelledby="viz-trend-heading">
              <h3 id="viz-trend-heading" className="mb-2 text-lg font-semibold text-ink">
                Symptom trend
              </h3>
              {checkins.length >= 2 ? (
                <div className="rounded-lg border border-line bg-surface p-3">
                  <Chart
                    config={trendConfig}
                    label="Line chart of symptom severity and peak flow over the last 14 days"
                  />
                </div>
              ) : (
                <p className="text-sm text-ink-soft">
                  Add a few check-ins to see your symptom trend over time.
                </p>
              )}
            </section>

            {/* Time-of-day chart */}
            <section aria-labelledby="viz-tod-heading">
              <h3 id="viz-tod-heading" className="mb-2 text-lg font-semibold text-ink">
                Puffs by time of day
              </h3>
              {doseLogs.length >= 1 ? (
                <div className="rounded-lg border border-line bg-surface p-3">
                  <Chart
                    config={timeOfDayConfig}
                    label="Bar chart of dose logs by Morning, Afternoon, Evening and Night"
                  />
                </div>
              ) : (
                <p className="text-sm text-ink-soft">
                  Log a dose to start seeing when you take your medicine most.
                </p>
              )}
            </section>

            {/* Adherence bars */}
            <section aria-labelledby="viz-adherence-heading">
              <h3 id="viz-adherence-heading" className="mb-2 text-lg font-semibold text-ink">
                Preventer adherence
              </h3>
              {hasControllerMed && doseLogs.length > 0 ? (
                <div className="space-y-3">
                  {meds
                    .filter((m) => m.medType === 'controller')
                    .map((med) => {
                      const counts = adherenceByDay[med.id] ?? []
                      const taken = counts.filter((n) => n > 0).length
                      return (
                        <div
                          key={med.id}
                          className="rounded-lg border border-line bg-surface p-3"
                        >
                          <div className="mb-2 flex items-baseline justify-between gap-2">
                            <p className="text-sm font-semibold text-ink">{med.name}</p>
                            <p className="text-xs text-ink-soft">
                              {taken} of {counts.length} days
                            </p>
                          </div>
                          <div
                            className="grid grid-cols-7 gap-1.5"
                            aria-label={`${med.name} adherence over the last 7 days`}
                          >
                            {counts.map((n, i) => (
                              <div key={i} className="flex flex-col items-center gap-1">
                                <div
                                  className={
                                    'h-10 w-full rounded ' +
                                    (n > 0
                                      ? 'bg-breathe-500'
                                      : 'border border-line bg-surface-muted')
                                  }
                                />
                                <span className="text-[10px] text-ink-soft">
                                  {dayLabel(dates[dates.length - 7 + i])}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-sm text-ink-soft">
                  Add a controller medication and log doses to see your adherence.
                </p>
              )}
            </section>

            {/* Insight card */}
            <section aria-labelledby="viz-insight-heading">
              <h3 id="viz-insight-heading" className="mb-2 text-lg font-semibold text-ink">
                What helped?
              </h3>
              <Card variant="soft" padding="md">
                {insight.delta != null ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="font-display text-4xl font-bold text-breathe-700">
                      {insight.delta > 0 ? '−' : ''}
                      {insight.delta !== 0 ? Math.abs(insight.delta).toFixed(1) : '0.0'}
                    </span>
                    <p className="flex-1 text-sm text-ink-soft">{insight.sentence}</p>
                  </div>
                ) : (
                  <p className="text-sm text-ink-soft">{insight.sentence}</p>
                )}
              </Card>
            </section>

            {/* Correlation heatmap */}
            <section aria-labelledby="viz-heatmap-heading">
              <h3 id="viz-heatmap-heading" className="mb-2 text-lg font-semibold text-ink">
                Correlations
              </h3>
              {corrCells.some((c) => c.rho != null) ? (
                <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                  <table className="w-full text-sm">
                    <caption className="sr-only">
                      Spearman correlations between symptoms, sleep, activity and peak flow
                    </caption>
                    <thead>
                      <tr>
                        <th
                          scope="col"
                          className="px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-ink-soft"
                        >
                          Pair
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-2 text-right text-xs font-bold uppercase tracking-wide text-ink-soft"
                        >
                          Correlation
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {corrCells.map((cell) => (
                        <tr key={cell.a} className="border-t border-line">
                          <th
                            scope="row"
                            className="px-3 py-2 text-left font-medium text-ink"
                          >
                            {cell.a}
                          </th>
                          <td
                            className={
                              'rounded px-3 py-2 text-right font-bold ' +
                              (cell.rho != null ? rhoTone(cell.rho) : 'text-ink-soft')
                            }
                          >
                            {cell.rho != null ? cell.rho.toFixed(2) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-ink-soft">
                  Add paired check-in data (e.g. symptoms and sleep) to see correlations.
                </p>
              )}
            </section>

            {/* Manage sample data */}
            <div className="border-t border-line pt-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="ghost"
                  onClick={handleRemoveSample}
                  disabled={demoBusy}
                  leadingIcon={<Icon name="trash" size={16} pixel />}
                >
                  Remove sample data
                </Button>
                <p className="text-xs text-ink-soft">Sample data — you can remove it anytime.</p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      <Modal
        open={deleteMedId !== null}
        onClose={() => setDeleteMedId(null)}
        title="Delete Medication"
        footer={
          <>
            <Button
              onClick={() => {
                if (deleteMedId) {
                  handleDeleteMed(deleteMedId)
                }
              }}
            >
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setDeleteMedId(null)}>
              Cancel
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete this medication? This action cannot be undone.</p>
      </Modal>

      <Modal
        open={deleteCheckinId !== null}
        onClose={() => setDeleteCheckinId(null)}
        title="Delete Check-in"
        footer={
          <>
            <Button
              onClick={() => {
                if (deleteCheckinId) {
                  handleDeleteCheckin(deleteCheckinId)
                }
              }}
            >
              Delete
            </Button>
            <Button variant="ghost" onClick={() => setDeleteCheckinId(null)}>
              Cancel
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete this check-in? This action cannot be undone.</p>
      </Modal>
    </div>
  )
}