import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Icon,
  IconButton,
  Modal,
  SegmentedControl,
  Stepper,
  Tile,
  EmptyState,
} from '../../design'
import type { IconName } from '../../design'
import { useRepository } from '../../data/RepositoryProvider'
import type {
  BreatheCheckin,
  BreatheCheckinInput,
  BreatheMed,
} from '../../data/types'
import { todayForResetHour } from '../../shared/day'

export function BreatheScreen() {
  const repo = useRepository()
  const navigate = useNavigate()

  // State
  const [tab, setTab] = useState<'log' | 'checkin' | 'meds'>('log')
  const [meds, setMeds] = useState<BreatheMed[]>([])
  const [checkins, setCheckins] = useState<BreatheCheckin[]>([])
  const [doseLogs, setDoseLogs] = useState<any[]>([]) // We'll type this later if needed, but for now any

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
  const [_editingMed, setEditingMed] = useState<BreatheMed | null>(null)
  const [editingCheckin, setEditingCheckin] = useState<BreatheCheckin | null>(null)

  // Modal states
  const [deleteMedId, setDeleteMedId] = useState<string | null>(null)
  const [deleteCheckinId, setDeleteCheckinId] = useState<string | null>(null)

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
      } catch (err) {
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
      } catch (err) {
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
      } catch (err) {
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
  }, [tab, meds.length, selectedMedId])

  // Handlers
  const handleTabChange = (value: string) => {
    setTab(value as 'log' | 'checkin' | 'meds')
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
    // This would be implemented with a form for adding/editing meds
    // For now, we'll focus on the structure
    // We'll implement a simple add medication form in the Medications tab
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
  ]

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
                <label className="block text-sm font-medium text-ink mb-2">
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
                <label className="block text-sm font-medium text-ink mb-2">
                  Time
                </label>
                <input
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
                              console.log('Delete dose log:', log.id)
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
                <div className="h-96 flex items-center justify-center">
                  <div className="h-6 w-full rounded border-line bg-surface-muted animate-pulse">
                    <div className="h-full w-full rounded"></div>
                  </div>
                </div>
              ) : errorCheckins ? (
                <div className="p-4 text-center text-overdrawn-ink">
                  {errorCheckins}
                </div>
              ) : checkins.length === 0 ? (
                <EmptyState
                  icon="check"
                  title="No check-ins yet"
                  body="Add your first check-in to start tracking your asthma"
                  action={<Button onClick={() => setTab('checkin')}>Add Check-in</Button>}
                />
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
                        <label className="block text-sm font-medium text-ink mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          value={checkinDate}
                          onChange={(e) => handleCheckinDateChange(e.target.value)}
                          className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                        />
                      </div>

                      {/* Peak Flow */}
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">
                          Peak Flow (L/min)
                        </label>
                        <input
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
                          <label className="block text-sm font-medium text-ink mb-2">
                            Symptoms (1-5)
                          </label>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label=""
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
                          <label className="block text-sm font-medium text-ink mb-2">
                            Sleep (1-5)
                          </label>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label=""
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
                          <label className="block text-sm font-medium text-ink mb-2">
                            Activity (1-5)
                          </label>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label=""
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
                   <label className="block text-sm font-medium text-ink mb-2">
                     Note
                   </label>
                   <textarea
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
                        <label className="block text-sm font-medium text-ink mb-2">
                          Date
                        </label>
                        <input
                          type="date"
                          value={checkinDate}
                          onChange={(e) => handleCheckinDateChange(e.target.value)}
                          className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                        />
                      </div>

                      {/* Peak Flow */}
                      <div>
                        <label className="block text-sm font-medium text-ink mb-2">
                          Peak Flow (L/min)
                        </label>
                        <input
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
                          <label className="block text-sm font-medium text-ink mb-2">
                            Symptoms (1-5)
                          </label>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label=""
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
                          <label className="block text-sm font-medium text-ink mb-2">
                            Sleep (1-5)
                          </label>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label=""
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
                          <label className="block text-sm font-medium text-ink mb-2">
                            Activity (1-5)
                          </label>
                          <div className="flex items-center gap-2">
                            <Stepper
                              label=""
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
                      <label className="block text-sm font-medium text-ink mb-2">
                        Note
                      </label>
                      <textarea
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
                  <label className="block text-sm font-medium text-ink mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    // In a real implementation, this would have its own state
                    className="block w-full rounded border-line bg-surface px-3 py-2 text-sm"
                    placeholder="e.g. Ventolin, Fluticasone"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Type
                  </label>
                  <select className="block w-full rounded border-line bg-surface px-3 py-2 text-sm">
                    <option value="controller">Controller</option>
                    <option value="reliever">Reliever</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-ink mb-1">
                    Reminder Hour (0-23)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={23}
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
                <div className="h-96 flex items-center justify-center">
                  <div className="h-6 w-full rounded border-line bg-surface-muted animate-pulse">
                    <div className="h-full w-full rounded"></div>
                  </div>
                </div>
              ) : errorMeds ? (
                <div className="p-4 text-center text-overdrawn-ink">
                  {errorMeds}
                </div>
              ) : meds.length === 0 ? (
                <EmptyState
                  icon="inhaler"
                  title="No medications yet"
                  body="Add your asthma medications to start tracking"
                  action={<Button onClick={handleSaveMed}>Add Medication</Button>}
                />
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
                      </div>
                    </li>
                    ))}
                </ul>
              )}
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