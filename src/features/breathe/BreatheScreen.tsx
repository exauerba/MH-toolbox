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
  EmptyState,
} from '../../design'
import { buildTimeOfDayConfig, buildTrendConfig, dayLabel, lastNDates, medDoseCountsByDay } from './chartData'
import { correlations, controlState, spearmanStrength, whatHelpedDelta } from './scoring'
import { removeAllBreatheData, seedSampleFortnight } from './demoData'
import type { IconName } from '../../design'
import { useRepository } from '../../data/RepositoryProvider'
import { cx } from '../../design/cx'
import type {
  BreatheCheckin,
  BreatheCheckinInput,
  BreatheDoseLog,
  BreatheMed,
} from '../../data/types'
import { fromISODate, todayForResetHour } from '../../shared/day'

interface CheckinRitualProps {
  checkins: BreatheCheckin[]
  loading: boolean
  error: string | null
  onSeedSample: () => void
  demoBusy: boolean
  editingCheckin: BreatheCheckin | null
  setEditingCheckin: (val: BreatheCheckin | null) => void
  checkinDate: string
  setCheckinDate: (val: string) => void
  peakFlow: number | null
  setPeakFlow: (val: number | null) => void
  selectedSymptoms: string[]
  setSelectedSymptoms: (val: string[]) => void
  selectedActivities: string[]
  setSelectedActivities: (val: string[]) => void
  note: string
  setNote: (val: string) => void
  onSave: () => void
  setDeleteCheckinId: (id: string | null) => void
  symptomPresets: string[]
  setSymptomPresets: (val: string[]) => void
  activityPresets: string[]
  setActivityPresets: (val: string[]) => void
  isEditingPresets: boolean
  setIsEditingPresets: (val: boolean) => void
  onSavePresets: () => void
}

function CheckinRitual({
  checkins,
  loading,
  error,
  onSeedSample,
  demoBusy,
  editingCheckin,
  setEditingCheckin,
  checkinDate,
  setCheckinDate,
  peakFlow,
  setPeakFlow,
  selectedSymptoms,
  setSelectedSymptoms,
  selectedActivities,
  setSelectedActivities,
  note,
  setNote,
  onSave,
  setDeleteCheckinId,
  symptomPresets,
  setSymptomPresets,
  activityPresets,
  setActivityPresets,
  isEditingPresets,
  setIsEditingPresets,
  onSavePresets,
}: CheckinRitualProps) {
  return (
    <div className="space-y-8">
      {/* Daily Breath Ritual */}
      <div className={cx(
        'relative p-6 rounded-3xl border-2 transition-all duration-500',
        'bg-airy-pink shadow-tactile-mid border-airy-pink-accent',
        editingCheckin ? 'bg-surface-muted border-line' : ''
      )}>
        {isEditingPresets ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-ink">Manage Presets</h3>
              <Button variant="ghost" onClick={() => setIsEditingPresets(false)}>Close</Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-3">
                <span className="block text-sm font-bold text-ink uppercase tracking-wider">Symptoms</span>
                <div className="flex flex-wrap gap-2">
                  {symptomPresets.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-line text-xs">
                      <span>{s}</span>
                      <button onClick={() => setSymptomPresets(symptomPresets.filter((_, idx) => idx !== i))} className="text-error-ink">×</button>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add symptom..."
                  className="w-full px-2 py-1 text-xs rounded border border-line"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      setSymptomPresets([...symptomPresets, e.currentTarget.value])
                      e.currentTarget.value = ''
                    }
                  }}
                />
              </div>
              <div className="space-y-3">
                <span className="block text-sm font-bold text-ink uppercase tracking-wider">Activities</span>
                <div className="flex flex-wrap gap-2">
                  {activityPresets.map((a, i) => (
                    <div key={i} className="flex items-center gap-1 bg-white px-2 py-1 rounded-full border border-line text-xs">
                      <span>{a}</span>
                      <button onClick={() => setActivityPresets(activityPresets.filter((_, idx) => idx !== i))} className="text-error-ink">×</button>
                    </div>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="Add activity..."
                  className="w-full px-2 py-1 text-xs rounded border border-line"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.currentTarget.value) {
                      setActivityPresets([...activityPresets, e.currentTarget.value])
                      e.currentTarget.value = ''
                    }
                  }}
                />
              </div>
            </div>
            <Button onClick={onSavePresets} className="w-full">Save Presets</Button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-ink">
                {editingCheckin ? 'Update Check-in' : 'Daily Breath Ritual'}
              </h3>
              <p className="text-sm text-ink-soft">How are you feeling today?</p>
            </div>
            <div className="grid gap-8">
              <div className="flex flex-wrap items-center justify-center gap-6">
                <div className="flex flex-col items-center gap-2">
                  <label htmlFor="breathe-checkin-date" className="text-xs font-bold uppercase tracking-wide text-ink-soft">Date</label>
                  <input
                    id="breathe-checkin-date"
                    type="date"
                    value={checkinDate}
                    onChange={(e) => setCheckinDate(e.target.value)}
                    className="rounded-full border-none bg-white/50 px-4 py-2 text-sm shadow-tactile-low focus:ring-2 focus:ring-airy-pink-accent"
                  />
                </div>
                <div className="flex flex-col items-center gap-2">
                  <label htmlFor="breathe-checkin-peak" className="text-xs font-bold uppercase tracking-wide text-ink-soft">Peak Flow</label>
                  <div className="relative group">
                    <input
                      id="breathe-checkin-peak"
                      type="number"
                      min={0}
                      value={peakFlow ?? ''}
                      onChange={(e) => setPeakFlow(e.target.value === '' ? null : Number(e.target.value))}
                      className="w-32 text-center text-2xl font-bold rounded-full border-none bg-white shadow-tactile-mid px-4 py-3 focus:ring-4 focus:ring-airy-pink-accent transition-all"
                      placeholder="---"
                    />
                    <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-medium text-ink-soft opacity-60">L/min</span>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <span className="block text-center text-xs font-bold uppercase tracking-widest text-ink-soft opacity-70">Symptoms</span>
                  <div className="flex flex-wrap justify-center gap-3">
                    {symptomPresets.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSymptoms(selectedSymptoms.includes(s) ? selectedSymptoms.filter(x => x !== s) : [...selectedSymptoms, s])}
                        className={cx(
                          'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 pressable',
                          selectedSymptoms.includes(s) ? 'bg-white text-ink shadow-tactile-mid scale-105' : 'bg-white/40 text-ink-soft hover:bg-white/60'
                        )}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <span className="block text-center text-xs font-bold uppercase tracking-widest text-ink-soft opacity-70">Activities & Triggers</span>
                  <div className="flex flex-wrap justify-center gap-3">
                    {activityPresets.map((a) => (
                      <button
                        key={a}
                        onClick={() => setSelectedActivities(selectedActivities.includes(a) ? selectedActivities.filter(x => x !== a) : [...selectedActivities, a])}
                        className={cx(
                          'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 pressable',
                          selectedActivities.includes(a) ? 'bg-white text-ink shadow-tactile-mid scale-105' : 'bg-white/40 text-ink-soft hover:bg-white/60'
                        )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <label htmlFor="breathe-checkin-note" className="block text-center text-xs font-bold uppercase tracking-widest text-ink-soft opacity-70">Journal Note</label>
                <textarea
                  id="breathe-checkin-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="block w-full rounded-2xl border-none bg-white/50 px-4 py-3 text-sm shadow-tactile-low focus:ring-2 focus:ring-airy-pink-accent transition-all"
                  rows={3}
                  placeholder="Any thoughts on your breathing today?"
                />
              </div>
            </div>
            <div className="flex justify-center">
              <Button
                onClick={onSave}
                className="px-12 py-6 rounded-full text-lg font-bold shadow-tactile-high transition-transform hover:scale-105 active:scale-95"
                leadingIcon={<Icon name="check" size={20} />}
              >
                {editingCheckin ? 'Update Ritual' : 'Save Ritual'}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Recent Check-ins */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-ink">Recent Check-ins</h3>
          <Button
            variant="ghost"
            onClick={() => setIsEditingPresets(true)}
            className="text-xs font-medium"
          >
            Edit Presets
          </Button>
        </div>

        {loading ? (
          <div data-testid="loading-checkins" className="h-96 flex items-center justify-center">
            <div className="h-6 w-full rounded border-line bg-surface-muted animate-pulse">
              <div className="h-full w-full rounded"></div>
            </div>
          </div>
        ) : error ? (
          <div className="p-4 text-center text-overdrawn-ink">{error}</div>
        ) : checkins.length === 0 ? (
          <>
            <EmptyState
              icon="check"
              title="No check-ins yet"
              body="Add your first check-in to start tracking your asthma, or explore with a sample fortnight"
              action={
                <Button
                  onClick={onSeedSample}
                  disabled={demoBusy}
                  leadingIcon={<Icon name="sparkle" size={16} pixel />}
                >
                  Try a sample fortnight
                </Button>
              }
            />
            <p className="mt-2 text-center text-xs text-ink-soft">Sample data — you can remove it anytime.</p>
          </>
        ) : (
          <div className="space-y-3">
            {checkins.slice(0, 5).map((checkin) => (
              <div
                key={checkin.id}
                className="flex items-center justify-between px-4 py-3 rounded-lg bg-surface shadow-tactile-low border border-line"
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
                        <p className="text-xs text-ink-soft">Peak Flow: {checkin.peakFlow} L/min</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {editingCheckin?.id === checkin.id ? (
                    <div className="flex gap-2">
                      <Button variant="ghost" onClick={() => setEditingCheckin(null)}>Cancel</Button>
                      <Button onClick={onSave} className="ml-3">Save</Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <IconButton
                        icon="edit"
                        label="Edit"
                        variant="ghost"
                        pixel
                        onClick={() => setEditingCheckin(checkin)}
                      />
                      <IconButton
                        icon="trash"
                        label="Delete"
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
    </div>
  )
}

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
  const [doseDate, setDoseDate] = useState<string>(todayForResetHour(0))
  const [doseTriggers, setDoseTriggers] = useState<string[]>([])
  const [editingDoseLog, setEditingDoseLog] = useState<BreatheDoseLog | null>(null)

  // Form states for Check-in tab
  const [checkinDate, setCheckinDate] = useState<string>('')
  const [peakFlow, setPeakFlow] = useState<number | null>(null)
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([])
  const [selectedActivities, setSelectedActivities] = useState<string[]>([])
  const [note, setNote] = useState<string>('')

  // Preset Management
  const [symptomPresets, setSymptomPresets] = useState(['Chest Tightness', 'Shortness of Breath', 'Coughing', 'Wheezing', 'Fatigue'])
  const [activityPresets, setActivityPresets] = useState(['Exercise', 'Cold Air', 'Pollen', 'Stress', 'Dust/Smoke'])
  const [isEditingPresets, setIsEditingPresets] = useState(false)

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
        setLoadingDoseLogs(true)
        const doseLogsData = await repo.listBreatheDoseLogs()
        if (!cancelled) {
          setDoseLogs(doseLogsData)
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

  useEffect(() => {
    if (meds.length > 0 && !selectedMedId) {
      setSelectedMedId(meds[0].id)
    }

    if (tab === 'checkin') {
      setCheckinDate(todayForResetHour(0))
    }
  }, [tab, meds, selectedMedId])

  const handleTabChange = (value: string) => {
    setTab(value as 'log' | 'checkin' | 'meds' | 'viz')
  }

  const handleMedSelect = (medId: string) => {
    setSelectedMedId(medId)
  }

  const handleDoseTimeChange = (time: string) => {
    setDoseTime(time)
  }

  const handleEditDose = (log: BreatheDoseLog) => {
    setEditingDoseLog(log)
    setSelectedMedId(log.medId)
    setDoseDate(log.date)
    setDoseTime(log.time ?? '')
    setDoseTriggers(log.trigger)
  }

  const handleAddNewDose = () => {
    setEditingDoseLog(null)
    setDoseTime('')
    setDoseTriggers([])
  }

  const handleLogDose = async () => {
    if (!selectedMedId) return

    setErrorDoseLogs(null)
    try {
      await repo.addBreatheDoseLog(
        {
          medId: selectedMedId,
          date: doseDate,
          time: doseTime || null,
          trigger: doseTriggers,
        },
        editingDoseLog?.id,
      )

      setLoadingDoseLogs(true)
      const doseLogsData = await repo.listBreatheDoseLogs()
      setDoseLogs(doseLogsData)
      setEditingDoseLog(null)
      setDoseTime('')
      setDoseTriggers([])
    } catch (err) {
      console.error('Failed to log dose:', err)
      setErrorDoseLogs('Failed to log dose')
    } finally {
      setLoadingDoseLogs(false)
    }
  }

  const handleSaveCheckin = async () => {
    setErrorCheckins(null)
    try {
      const checkinData: BreatheCheckinInput = {
        date: checkinDate,
        peakFlow,
        symptoms: selectedSymptoms.length,
        sleep: 3,
        activity: selectedActivities.length,
        note: note.trim() || null,
      }

      if (editingCheckin) {
        await repo.saveBreatheCheckin(checkinData, editingCheckin.id)
        setEditingCheckin(null)
      } else {
        await repo.saveBreatheCheckin(checkinData)
      }

      setLoadingCheckins(true)
      const updatedCheckins = await repo.listBreatheCheckins()
      setCheckins(updatedCheckins)

      setCheckinDate(todayForResetHour(0))
      setPeakFlow(null)
      setSelectedSymptoms([])
      setSelectedActivities([])
      setNote('')
    } catch (err) {
      console.error('Failed to save check-in:', err)
      setErrorCheckins('Failed to save check-in')
    } finally {
      setLoadingCheckins(false)
    }
  }

  const handleSavePresets = () => {
    setIsEditingPresets(false)
  }

  const handleSaveMed = async () => {
    if (!newMedName.trim()) return

    setErrorMeds(null)
    try {
      await repo.saveBreatheMed({
        name: newMedName.trim(),
        medType: newMedType,
        reminderHour: newMedReminder ? Number(newMedReminder) : null,
      })

      setLoadingMeds(true)
      const updatedMeds = await repo.listBreatheMeds()
      setMeds(updatedMeds)
      setNewMedName('')
      setNewMedType('controller')
      setNewMedReminder('')
    } catch (err) {
      console.error('Failed to save medication:', err)
      setErrorMeds('Failed to save medication')
    } finally {
      setLoadingMeds(false)
    }
  }

  const handleDeleteDoseLog = async (id: string) => {
    setErrorDoseLogs(null)
    try {
      await repo.deleteBreatheDoseLog(id)
      setLoadingDoseLogs(true)
      const doseLogsData = await repo.listBreatheDoseLogs()
      setDoseLogs(doseLogsData)
    } catch (err) {
      console.error('Failed to delete dose log:', err)
      setErrorDoseLogs('Failed to delete dose log')
    } finally {
      setLoadingDoseLogs(false)
    }
  }

  const handleDeleteMed = async (id: string) => {
    setErrorMeds(null)
    try {
      await repo.deleteBreatheMed(id)
      setDeleteMedId(null)
      setLoadingMeds(true)
      const updatedMeds = await repo.listBreatheMeds()
      setMeds(updatedMeds)
    } catch (err) {
      console.error('Failed to delete medication:', err)
      setErrorMeds('Failed to delete medication')
      setDeleteMedId(null)
    } finally {
      setLoadingMeds(false)
    }
  }

  const handleDeleteCheckin = async (id: string) => {
    setErrorCheckins(null)
    try {
      await repo.deleteBreatheCheckin(id)
      setDeleteCheckinId(null)
      setLoadingCheckins(true)
      const updatedCheckins = await repo.listBreatheCheckins()
      setCheckins(updatedCheckins)
    } catch (err) {
      console.error('Failed to delete check-in:', err)
      setErrorCheckins('Failed to delete check-in')
      setDeleteCheckinId(null)
    } finally {
      setLoadingCheckins(false)
    }
  }

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
      setMeds(m)
      setCheckins(c)
      setDoseLogs(d)
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

  const header = (
    <header className="mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <IconButton
          icon="arrowLeft"
          label="Back to home"
          variant="ghost"
          round
          className="bg-airy-surface/60 text-ink-soft hover:bg-airy-surface"
          onClick={() => navigate('/')}
        />
        <h1 className="text-3xl font-medium tracking-tight text-ink">Breathe</h1>
      </div>
    </header>
  )

  const tabs: { value: string; label: string; icon: IconName }[] = [
    { value: 'log', label: 'Log Dose', icon: 'plus' },
    { value: 'checkin', label: 'Check-in', icon: 'check' },
    { value: 'meds', label: 'Medications', icon: 'inhaler' },
    { value: 'viz', label: 'Visualize', icon: 'sparkle' },
  ]

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
  const doseLogsForDay = useMemo(
    () => doseLogs.filter((log) => log.date === doseDate),
    [doseLogs, doseDate],
  )
  // Heading label for the day's list — "Today" beats a raw ISO string, and a
  // past day gets its weekday so the list has context at a glance.
  const doseDateLabel = !doseDate
    ? 'No day selected'
    : doseDate === todayForResetHour(0)
      ? 'Today'
      : fromISODate(doseDate).toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })

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
    <div className="relative min-h-screen overflow-hidden bg-airy-pink py-8 px-4 sm:px-8">
      {/* Ambient breathing background — pulsating organic glows */}
      <div className="pointer-events-none absolute -inset-20 z-0">
        <div className="animate-breathe-ambient absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-airy-pink-accent/40 blur-3xl" />
        <div className="animate-breathe-ambient absolute left-1/4 top-1/3 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-airy-blue/40 blur-3xl [animation-delay:1s]" />
        <div className="animate-breathe-ambient absolute bottom-1/4 right-1/4 h-[500px] w-[500px] translate-x-1/2 translate-y-1/2 rounded-full bg-airy-pink-accent/30 blur-3xl [animation-delay:2s]" />
      </div>

      <div className="relative z-10 mx-auto max-w-2xl">
        {header}

        <Card
          variant="soft"
          padding="lg"
          className="overflow-hidden border-none bg-airy-surface/80 shadow-tactile-mid backdrop-blur-md !rounded-organic"
        >
          <SegmentedControl
            label="Sections"
            value={tab}
            onChange={handleTabChange}
            className="mb-6 border-airy-pink-accent/30 bg-airy-pink/50 sm:mb-8"
            options={tabs}
            wrap
          />

          {tab === 'log' && (
            <div className="animate-pop-in space-y-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="space-y-2">
                  <label htmlFor="breathe-dose-medication" className="block text-sm font-medium text-ink-soft">
                    Medication
                  </label>
                  {loadingMeds ? (
                    <div data-testid="loading-medications" className="h-11 w-full animate-pulse rounded-2xl bg-airy-pink/60" />
                  ) : errorMeds ? (
                    <div className="flex h-11 w-full items-center rounded-2xl bg-state-flare px-4 text-sm text-state-flare-ink">{errorMeds}</div>
                  ) : (
                    <select
                      id="breathe-dose-medication"
                      value={selectedMedId || ''}
                      onChange={(e) => handleMedSelect(e.target.value)}
                      className="h-11 w-full rounded-2xl border-none bg-airy-pink/60 px-4 text-ink transition-colors focus:bg-white focus:ring-2 focus:ring-airy-pink-accent"
                    >
                      {meds.length === 0 ? (
                        <option value="">No medications available</option>
                      ) : (
                        meds.map((med) => (
                          <option key={med.id} value={med.id}>
                            {med.name}
                          </option>
                        ))
                      )}
                    </select>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="breathe-dose-date" className="block text-sm font-medium text-ink-soft">
                    Date
                  </label>
                  <input
                    id="breathe-dose-date"
                    type="date"
                    max={todayForResetHour(0)}
                    value={doseDate}
                    onChange={(e) => setDoseDate(e.target.value)}
                    className="h-11 w-full rounded-2xl border-none bg-airy-pink/60 px-4 text-ink transition-colors focus:bg-white focus:ring-2 focus:ring-airy-pink-accent"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="breathe-dose-time" className="block text-sm font-medium text-ink-soft">
                    Time
                  </label>
                  <input
                    id="breathe-dose-time"
                    type="time"
                    value={doseTime}
                    onChange={(e) => handleDoseTimeChange(e.target.value)}
                    className="h-11 w-full rounded-2xl border-none bg-airy-pink/60 px-4 text-ink transition-colors focus:bg-white focus:ring-2 focus:ring-airy-pink-accent"
                  />
                </div>
              </div>

              <div className="space-y-3">
                <span className="block text-xs font-bold uppercase tracking-wider text-ink-soft">
                  What triggered it? (optional)
                </span>
                <div className="flex flex-wrap gap-2">
                  {activityPresets.map((a) => (
                    <button
                      key={a}
                      type="button"
                      aria-pressed={doseTriggers.includes(a)}
                      onClick={() =>
                        setDoseTriggers(
                          doseTriggers.includes(a)
                            ? doseTriggers.filter((x) => x !== a)
                            : [...doseTriggers, a],
                        )
                      }
                      className={cx(
                        'px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 pressable',
                        doseTriggers.includes(a)
                          ? 'bg-white text-ink shadow-tactile-mid scale-105'
                          : 'bg-white/40 text-ink-soft hover:bg-white/60',
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={handleLogDose}
                  className="h-14 flex-1 rounded-full bg-airy-pink-accent text-ink shadow-tactile-mid transition-all hover:scale-[1.02] hover:bg-airy-pink-accent/90 active:scale-95"
                >
                  {editingDoseLog ? 'Update Dose' : 'Log Dose'}
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleAddNewDose}
                  className="h-14 rounded-full px-6"
                >
                  {editingDoseLog ? 'Cancel' : 'Add new'}
                </Button>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">
                  Dose Logs · {doseDateLabel}
                </h3>
                {loadingDoseLogs ? (
                  <div className="h-24 w-full animate-pulse rounded-2xl bg-airy-pink/40" />
                ) : errorDoseLogs ? (
                  <p className="text-sm text-state-flare-ink">{errorDoseLogs}</p>
                ) : doseLogsForDay.length === 0 ? (
                  <p className="py-8 text-center text-sm text-ink-soft">No dose logs for this day. Log a dose to get started.</p>
                ) : (
                  <ul className="space-y-2">
                    {doseLogsForDay.map((log) => {
                      const med = meds.find((m) => m.id === log.medId)
                      return (
                        <li key={log.id} className="flex items-center justify-between rounded-2xl bg-airy-surface/60 p-4 shadow-tactile-low">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-airy-pink-accent/30 text-ink-soft">
                              <Icon name="clock" size={16} />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-ink">{log.time ?? 'No time'}</p>
                              <p className="truncate text-xs text-ink-soft">
                                {med?.name ?? 'Unknown med'}
                                {log.trigger.length > 0 ? ` · ${log.trigger.join(', ')}` : ''}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <IconButton icon="edit" label="Edit dose log" variant="ghost" onClick={() => handleEditDose(log)} />
                            <IconButton icon="trash" label="Delete dose log" variant="ghost" onClick={() => handleDeleteDoseLog(log.id)} />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === 'checkin' && (
            <CheckinRitual
              checkins={checkins}
              loading={loadingCheckins}
              error={errorCheckins}
              onSeedSample={handleSeedSample}
              demoBusy={demoBusy}
              editingCheckin={editingCheckin}
              setEditingCheckin={setEditingCheckin}
              checkinDate={checkinDate}
              setCheckinDate={setCheckinDate}
              peakFlow={peakFlow}
              setPeakFlow={setPeakFlow}
              selectedSymptoms={selectedSymptoms}
              setSelectedSymptoms={setSelectedSymptoms}
              selectedActivities={selectedActivities}
              setSelectedActivities={setSelectedActivities}
              note={note}
              setNote={setNote}
              onSave={handleSaveCheckin}
              setDeleteCheckinId={setDeleteCheckinId}
              symptomPresets={symptomPresets}
              setSymptomPresets={setSymptomPresets}
              activityPresets={activityPresets}
              setActivityPresets={setActivityPresets}
              isEditingPresets={isEditingPresets}
              setIsEditingPresets={setIsEditingPresets}
              onSavePresets={handleSavePresets}
            />
          )}

          {tab === 'meds' && (
            <div className="animate-pop-in space-y-8">
              <div className="space-y-6 rounded-3xl border border-airy-pink-accent/20 bg-airy-pink/30 p-6">
                <h3 className="text-lg font-medium text-ink">Add Medication</h3>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label htmlFor="breathe-med-name" className="block text-sm font-medium text-ink-soft">Name</label>
                    <input
                      id="breathe-med-name"
                      type="text"
                      value={newMedName}
                      onChange={(e) => setNewMedName(e.target.value)}
                      className="h-11 w-full rounded-2xl border-none bg-airy-surface/70 px-4 text-ink transition-colors focus:bg-white focus:ring-2 focus:ring-airy-pink-accent"
                      placeholder="e.g. Ventolin, Fluticasone"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="breathe-med-type" className="block text-sm font-medium text-ink-soft">Type</label>
                    <select
                      id="breathe-med-type"
                      value={newMedType}
                      onChange={(e) => setNewMedType(e.target.value as 'controller' | 'reliever' | 'other')}
                      className="h-11 w-full rounded-2xl border-none bg-airy-surface/70 px-4 text-ink transition-colors focus:bg-white focus:ring-2 focus:ring-airy-pink-accent"
                    >
                      <option value="controller">Controller</option>
                      <option value="reliever">Reliever</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="breathe-med-reminder" className="block text-sm font-medium text-ink-soft">Reminder Hour (0-23)</label>
                    <input
                      id="breathe-med-reminder"
                      type="number"
                      min={0}
                      max={23}
                      value={newMedReminder}
                      onChange={(e) => setNewMedReminder(e.target.value)}
                      className="h-11 w-full rounded-2xl border-none bg-airy-surface/70 px-4 text-ink transition-colors focus:bg-white focus:ring-2 focus:ring-airy-pink-accent"
                      placeholder="Optional"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      onClick={handleSaveMed}
                      disabled={!newMedName.trim()}
                      className="h-11 w-full rounded-2xl bg-airy-pink-accent text-ink shadow-tactile-low transition-all hover:bg-airy-pink-accent/90"
                    >
                      Add Medication
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink-soft">Your Medications</h3>
                {loadingMeds ? (
                  <div data-testid="loading-medications" className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 w-full animate-pulse rounded-2xl bg-airy-pink/40" />
                    ))}
                  </div>
                ) : errorMeds ? (
                  <p className="text-sm text-state-flare-ink">{errorMeds}</p>
                ) : meds.length === 0 ? (
                  <>
                    <EmptyState
                      icon="inhaler"
                      title="No medications yet"
                      body="Add your asthma medications to start tracking"
                      action={
                        <Button onClick={handleSeedSample} disabled={demoBusy} className="rounded-full bg-airy-pink-accent text-ink shadow-tactile-low">
                          Try a sample fortnight
                        </Button>
                      }
                    />
                    <p className="text-center text-xs text-ink-soft">Sample data — you can remove it anytime.</p>
                  </>
                ) : (
                  <ul className="space-y-2">
                    {meds.map((med) => (
                      <li
                        key={med.id}
                        className={cx(
                          'flex items-center justify-between rounded-2xl p-4 shadow-tactile-low transition-colors',
                          selectedMedId === med.id ? 'bg-airy-pink-accent/30 ring-2 ring-airy-pink-accent' : 'bg-airy-surface/60 hover:bg-airy-surface',
                        )}
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          className="flex min-w-0 cursor-pointer items-center gap-3"
                          onClick={() => handleMedSelect(med.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              handleMedSelect(med.id)
                            }
                          }}
                        >
                          <div className={cx(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                            med.medType === 'controller' ? 'bg-airy-blue/50 text-ink-soft' : 'bg-airy-pink-accent/40 text-ink-soft',
                          )}>
                            <Icon name={med.medType === 'controller' ? 'check' : 'wind'} size={18} />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{med.name}</p>
                            <p className="text-xs text-ink-soft">
                              {med.medType === 'controller' ? 'Controller' : med.medType === 'reliever' ? 'Reliever' : 'Other'}
                              {med.reminderHour != null ? ` · ${med.reminderHour}:00` : ''}
                            </p>
                          </div>
                        </div>
                        <IconButton icon="trash" label={`Delete ${med.name}`} variant="ghost" onClick={() => setDeleteMedId(med.id)} />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {tab === 'viz' && (
            <div className="animate-pop-in space-y-8">
              <section aria-labelledby="viz-control-heading">
                <h3 id="viz-control-heading" className="mb-3 text-lg font-medium text-ink">Asthma control</h3>
                <div className="relative overflow-hidden rounded-3xl border border-white/40 bg-gradient-to-br from-airy-pink-accent/25 to-airy-blue/25 p-8 text-center shadow-tactile-low">
                  <div role="status" className="relative z-10 flex flex-col items-center">
                    <span className="mb-1 text-sm font-medium text-ink-soft">Asthma Control Score</span>
                    <div className="mb-4 flex items-baseline gap-1">
                      <span className="text-6xl font-bold tracking-tight text-ink">{control.score}</span>
                      <span className="text-2xl text-ink-soft">/ 100</span>
                    </div>
                    <Chip
                      tone={
                        control.label === 'Controlled' ? 'brand' :
                        control.label === 'Partly controlled' ? 'low' :
                        control.label === 'Uncontrolled' ? 'overdrawn' : 'neutral'
                      }
                      icon={<Icon name={control.label === 'Controlled' ? 'check' : control.label === 'No data' ? 'sparkle' : 'wind'} size={14} />}
                    >
                      {control.label}
                    </Chip>
                    <ProgressBar
                      value={control.score}
                      max={100}
                      label="Control score"
                      valueText={`${control.score}/100`}
                      tone={
                        control.label === 'Controlled' ? 'ok' :
                        control.label === 'Partly controlled' ? 'low' :
                        control.label === 'Uncontrolled' ? 'overdrawn' : 'default'
                      }
                      className="mt-5 w-full max-w-xs"
                    />
                    <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">{control.copy}</p>
                  </div>
                </div>
              </section>

              <section aria-labelledby="viz-trend-heading">
                <h3 id="viz-trend-heading" className="mb-2 text-sm font-bold text-ink">Symptom trend</h3>
                {checkins.length >= 2 ? (
                  <div className="rounded-2xl border border-airy-pink-accent/10 bg-airy-surface/50 p-3 shadow-tactile-low">
                    <Chart
                      config={trendConfig}
                      label="Line chart of symptom severity and peak flow over the last 14 days"
                    />
                  </div>
                ) : (
                  <p className="flex h-40 items-center justify-center rounded-2xl border-2 border-dashed border-airy-pink-accent/30 bg-airy-pink/20 text-sm italic text-ink-soft">
                    Add a few check-ins to see your symptom trend over time.
                  </p>
                )}
              </section>

              <section aria-labelledby="viz-tod-heading">
                <h3 id="viz-tod-heading" className="mb-2 text-sm font-bold text-ink">Puffs by time of day</h3>
                {doseLogs.length >= 1 ? (
                  <div className="rounded-2xl border border-airy-pink-accent/10 bg-airy-surface/50 p-3 shadow-tactile-low">
                    <Chart
                      config={timeOfDayConfig}
                      label="Bar chart of dose logs by Morning, Afternoon, Evening and Night"
                    />
                  </div>
                ) : (
                  <p className="flex h-40 items-center justify-center rounded-2xl border-2 border-dashed border-airy-pink-accent/30 bg-airy-pink/20 text-sm italic text-ink-soft">
                    Log a dose to start seeing when you take your medicine most.
                  </p>
                )}
              </section>

              <section aria-labelledby="viz-adherence-heading">
                <h3 id="viz-adherence-heading" className="mb-2 text-sm font-bold text-ink">Preventer adherence</h3>
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
                            className="rounded-2xl border border-airy-pink-accent/10 bg-airy-surface/50 p-4 shadow-tactile-low"
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
                                      'h-10 w-full rounded-lg ' +
                                      (n > 0
                                        ? 'bg-airy-pink-accent'
                                        : 'border border-airy-pink-accent/30 bg-airy-pink/30')
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

              <section aria-labelledby="viz-insight-heading">
                <h3 id="viz-insight-heading" className="mb-2 text-sm font-bold text-ink">What helped?</h3>
                <div className="rounded-2xl border border-airy-blue/50 bg-airy-blue/30 p-4 shadow-tactile-low">
                  {insight.delta != null ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="text-4xl font-bold text-ink">
                        {insight.delta > 0 ? '−' : ''}
                        {insight.delta !== 0 ? Math.abs(insight.delta).toFixed(1) : '0.0'}
                      </span>
                      <p className="flex-1 text-sm text-ink-soft">{insight.sentence}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-ink-soft">{insight.sentence}</p>
                  )}
                </div>
              </section>

              <section aria-labelledby="viz-heatmap-heading">
                <h3 id="viz-heatmap-heading" className="mb-2 text-sm font-bold text-ink">Correlations</h3>
                {corrCells.some((c) => c.rho != null) ? (
                  <div className="overflow-x-auto rounded-2xl border border-airy-pink-accent/20 bg-airy-surface/50 shadow-tactile-low">
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
                          <tr key={cell.a} className="border-t border-airy-pink-accent/10">
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

              <div className="flex justify-center pt-2">
                <Button
                  variant="ghost"
                  onClick={handleRemoveSample}
                  disabled={demoBusy}
                  className="text-xs text-ink-soft hover:text-ink"
                >
                  Remove sample data
                </Button>
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
    </div>
  )
}