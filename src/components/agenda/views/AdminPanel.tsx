'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  ShieldCheck,
  Building2,
  Users,
  KeyRound,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar as CalIcon,
  ChevronRight,
  Tags,
  Pencil,
  TrendingUp,
  Eye,
  CalendarCheck,
  Wallet,
  Settings,
  Save,
  Headset,
  LayoutDashboard,
  BadgeCheck,
  Lock,
  Mail,
  Star,
  MessageSquare,
  UserCheck,
} from 'lucide-react'
import { useRouterStore } from '@/lib/stores/router-store'
import { useAuth } from '@/lib/stores/auth-store'
import { CUBA_PROVINCES } from '@/lib/provinces'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'
import * as LucideIcons from 'lucide-react'

interface Owner {
  id: string
  username: string
  name: string
  email?: string | null
  phone?: string | null
  emailVerified?: boolean
  emailVerifiedAt?: string | null
  createdAt: string
  _count?: { businesses: number }
}

interface AdminUser {
  id: string
  username: string
  name: string
  createdAt: string
  updatedAt: string
}

interface AdminBusiness {
  id: string
  slug: string
  name: string
  description?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  createdAt: string
  category: { id: string; name: string; slug: string }
  owner: { id: string; username: string; name: string }
  license?: {
    id: string
    startDate: string
    endDate: string
    durationDays: number
    active: boolean
  } | null
  _count?: { appointments: number; services: number }
}

interface License {
  id: string
  businessId: string
  startDate: string
  endDate: string
  durationDays: number
  active: boolean
  business: { id: string; name: string; slug: string }
}

interface Category {
  id: string
  name: string
  slug: string
  icon: string
  description?: string | null
  _count?: { businesses: number }
}

interface BusinessMetrics {
  visits: number
  appointments: number
  pending: number
  confirmed: number
  completed: number
  cancelled: number
  revenue: number
}

interface Stats {
  totals: {
    businesses: number
    owners: number
    categories: number
    appointments: number
    visits: number
    activeLicenses: number
    services: number
  }
  appointmentsThisWeek: number
  appointmentsLastWeek: number
  appointmentsByStatus: { status: string; count: number }[]
  appointmentsByDay: { date: string; count: number }[]
  topBusinessesByVisits: { id: string; name: string; slug: string; count: number }[]
  topBusinessesByAppointments: { id: string; name: string; slug: string; count: number }[]
  topServices: { name: string; count: number }[]
  businessMetrics: Record<string, BusinessMetrics>
}

interface Plan {
  id: string
  name: string
  durationDays: number
  price: number
  active: boolean
}

interface ReviewAdmin {
  id: string
  businessId: string
  customerHash: string
  customerName?: string | null
  rating: number
  comment?: string | null
  createdAt: string
  business: { id: string; name: string; slug: string }
}

interface PaymentCode {
  id: string
  code: string
  businessId: string
  planName: string
  price: number
  durationDays: number
  kind?: string // plan | certificacion
  status: string // pendiente | pagada | rechazada
  createdAt: string
  business: { name: string; slug: string }
}

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmada: 'Confirmada',
  completada: 'Completada',
  cancelada: 'Cancelada',
}

const STATUS_COLORS: Record<string, string> = {
  pendiente: 'var(--chart-3)',
  confirmada: 'var(--chart-4)',
  completada: 'var(--chart-1)',
  cancelada: 'var(--chart-5)',
}

const ICON_SUGGESTIONS = [
  'Scissors',
  'Sparkles',
  'Flower2',
  'Hand',
  'Smile',
  'Activity',
  'Brush',
  'Wrench',
  'PawPrint',
  'Camera',
  'Heart',
  'Gem',
  'ShoppingBag',
  'Cpu',
  'GraduationCap',
  'Music',
  'Plane',
  'BookOpen',
  'Dumbbell',
  'Car',
  'Pizza',
  'Coffee',
  'House',
  'Laptop',
  'Smartphone',
  'Shirt',
  'Baby',
  'Palette',
  'Pill',
  'Stethoscope',
  'Paintbrush',
  'Hammer',
  'Bike',
  'Train',
  'Ship',
  'Store',
  'Salad',
  'Cake',
  'IceCream',
  'GlassWater',
  'Wine',
  'Key',
  'Lock',
  'Gavel',
  'Landmark',
  'Tent',
  'TreePine',
  'Sun',
  'Moon',
  'Zap',
  'Feather',
  'Anchor',
  'Ribbon',
  'Crown',
  'Sword',
  'Shield',
  'Rocket',
  'Globe',
  'Map',
  'Compass',
]

// Catálogo estático de iconos para categorías. react-hooks/static-components no
// permite resolver iconos con lookup dinámico en el render, así que las
// referencias se declaran aquí y se indexan por nombre.
const CATEGORY_ICONS: Record<string, LucideIcons.LucideIcon> = {
  Scissors: LucideIcons.Scissors,
  Sparkles: LucideIcons.Sparkles,
  Flower2: LucideIcons.Flower2,
  Hand: LucideIcons.Hand,
  Smile: LucideIcons.Smile,
  Activity: LucideIcons.Activity,
  Brush: LucideIcons.Brush,
  Wrench: LucideIcons.Wrench,
  PawPrint: LucideIcons.PawPrint,
  Camera: LucideIcons.Camera,
  Heart: LucideIcons.Heart,
  Gem: LucideIcons.Gem,
  ShoppingBag: LucideIcons.ShoppingBag,
  Cpu: LucideIcons.Cpu,
  GraduationCap: LucideIcons.GraduationCap,
  Music: LucideIcons.Music,
  Plane: LucideIcons.Plane,
  BookOpen: LucideIcons.BookOpen,
  Dumbbell: LucideIcons.Dumbbell,
  Car: LucideIcons.Car,
  Pizza: LucideIcons.Pizza,
  Coffee: LucideIcons.Coffee,
  House: LucideIcons.House,
  Laptop: LucideIcons.Laptop,
  Smartphone: LucideIcons.Smartphone,
  Shirt: LucideIcons.Shirt,
  Baby: LucideIcons.Baby,
  Palette: LucideIcons.Palette,
  Pill: LucideIcons.Pill,
  Stethoscope: LucideIcons.Stethoscope,
  Paintbrush: LucideIcons.Paintbrush,
  Hammer: LucideIcons.Hammer,
  Bike: LucideIcons.Bike,
  Train: LucideIcons.Train,
  Ship: LucideIcons.Ship,
  Store: LucideIcons.Store,
  Salad: LucideIcons.Salad,
  Cake: LucideIcons.Cake,
  IceCream: LucideIcons.IceCream,
  GlassWater: LucideIcons.GlassWater,
  Wine: LucideIcons.Wine,
  Key: LucideIcons.Key,
  Lock: LucideIcons.Lock,
  Gavel: LucideIcons.Gavel,
  Landmark: LucideIcons.Landmark,
  Tent: LucideIcons.Tent,
  TreePine: LucideIcons.TreePine,
  Sun: LucideIcons.Sun,
  Moon: LucideIcons.Moon,
  Zap: LucideIcons.Zap,
  Feather: LucideIcons.Feather,
  Anchor: LucideIcons.Anchor,
  Ribbon: LucideIcons.Ribbon,
  Crown: LucideIcons.Crown,
  Sword: LucideIcons.Sword,
  Shield: LucideIcons.Shield,
  Rocket: LucideIcons.Rocket,
  Globe: LucideIcons.Globe,
  Map: LucideIcons.Map,
  Compass: LucideIcons.Compass,
}

function CategoryIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && CATEGORY_ICONS[name]) || LucideIcons.Sparkles
  return <Icon className={className} />
}

function truncLabel(s: string, max = 14) {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export function AdminPanel() {
  const { navigate } = useRouterStore()
  const { session, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('overview')
  const [owners, setOwners] = useState<Owner[]>([])
  const [businesses, setBusinesses] = useState<AdminBusiness[]>([])
  const [licenses, setLicenses] = useState<License[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  // Form: crear owner
  const [showOwnerForm, setShowOwnerForm] = useState(false)
  const [ownerForm, setOwnerForm] = useState({ username: '', password: '', name: '', email: '', phone: '' })

  // Form: crear negocio
  const [showBizForm, setShowBizForm] = useState(false)
  const [bizForm, setBizForm] = useState({
    province: '',
    name: '',
    slug: '',
    description: '',
    address: '',
    phone: '',
    email: '',
    ownerId: '',
    categoryId: '',
    licenseDays: '30',
  })

  // Form: extender licencia
  const [showLicForm, setShowLicForm] = useState(false)
  const [licForm, setLicForm] = useState({ businessId: '', addDays: '30' })

  // Form: crear/editar categoría
  const [showCatForm, setShowCatForm] = useState(false)
  const [catForm, setCatForm] = useState({ id: '', name: '', slug: '', icon: '', description: '' })

  // Dialog: detalle de negocio (click en cards / barras de gráficas)
  const [detailBusiness, setDetailBusiness] = useState<AdminBusiness | null>(null)

  const [supportPhone, setSupportPhone] = useState('')

  // Certificación y días de prueba (configurables)
  const [certPrice, setCertPrice] = useState('')
  const [trialFirst, setTrialFirst] = useState('30')
  const [trialExtra, setTrialExtra] = useState('5')

  // Cambiar contraseña de un dueño existente
  const [pwdOwner, setPwdOwner] = useState<Owner | null>(null)
  const [newPwd, setNewPwd] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)

  // Editar datos de un dueño existente
  const [editOwner, setEditOwner] = useState<Owner | null>(null)
  const [editOwnerForm, setEditOwnerForm] = useState({ name: '', username: '', email: '', phone: '' })
  const [savingEditOwner, setSavingEditOwner] = useState(false)

  // Correo SMTP (envío de códigos OTP de verificación y recuperación)
  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('465')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')

  // Cambiar mi propia contraseña (admin logueado)
  const [currentPwd, setCurrentPwd] = useState('')
  const [myNewPwd, setMyNewPwd] = useState('')
  const [myNewPwd2, setMyNewPwd2] = useState('')
  const [savingMyPwd, setSavingMyPwd] = useState(false)

  // Reseñas (moderación antidifamación)
  const [reviews, setReviews] = useState<ReviewAdmin[]>([])
  const [editReview, setEditReview] = useState<ReviewAdmin | null>(null)
  const [editFormReview, setEditFormReview] = useState({ rating: 5, comment: '', customerName: '' })
  const [savingReview, setSavingReview] = useState(false)

  // Planes de suscripción (precios)
  const [plans, setPlans] = useState<Plan[]>([])
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [planForm, setPlanForm] = useState({ name: '', durationDays: '30', price: '' })

  // Búsquedas en tablas
  const [bizSearch, setBizSearch] = useState('')
  const [ownerSearch, setOwnerSearch] = useState('')
  const [licSearch, setLicSearch] = useState('')

  // Paginado de tablas (20 por página)
  const [bizPage, setBizPage] = useState(1)
  const [ownerPage, setOwnerPage] = useState(1)
  const [licPage, setLicPage] = useState(1)
  const [reviewPage, setReviewPage] = useState(1)
  const [userPage, setUserPage] = useState(1)

  // Códigos de pago de los dueños (tab Licencias)
  const [paymentCodes, setPaymentCodes] = useState<PaymentCode[]>([])
  const [payCodeInput, setPayCodeInput] = useState('')
  const [applyingCode, setApplyingCode] = useState(false)
  const [showCodeHistory, setShowCodeHistory] = useState(false)

  // Usuarios administradores (tab Usuarios)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [showAdminForm, setShowAdminForm] = useState(false)
  const [adminForm, setAdminForm] = useState({ name: '', username: '', password: '' })
  const [editAdmin, setEditAdmin] = useState<AdminUser | null>(null)
  const [editAdminForm, setEditAdminForm] = useState({ name: '', username: '', password: '' })
  const [savingAdmin, setSavingAdmin] = useState(false)

  useEffect(() => {
    // Esperar a que termine la carga de la sesión antes de decidir
    if (authLoading) return
    if (session.role !== 'admin') {
      navigate('/login')
      return
    }
  }, [session.role, authLoading, navigate])

  const loadAll = useCallback(async () => {
    try {
      const [o, b, l, c, s, cfg, pl, pc, rv, ad] = await Promise.all([
        fetch('/api/admin/owners').then((r) => r.json()),
        fetch('/api/admin/businesses').then((r) => r.json()),
        fetch('/api/admin/licenses').then((r) => r.json()),
        fetch('/api/admin/categories').then((r) => r.json()),
        fetch('/api/admin/stats').then((r) => r.json()),
        fetch('/api/admin/settings').then((r) => r.json()),
        fetch('/api/admin/plans').then((r) => r.json()),
        fetch('/api/admin/payment-codes').then((r) => r.json()),
        fetch('/api/admin/reviews').then((r) => r.json()).catch(() => []),
        fetch('/api/admin/users').then((r) => r.json()).catch(() => []),
      ])
      setOwners(o)
      setBusinesses(b)
      setLicenses(l)
      setCategories(c)
      if (!s?.error) setStats(s)
      if (Array.isArray(ad)) setAdmins(ad)
      // /api/admin/settings devuelve un array de {key, value}
      if (Array.isArray(cfg)) {
        const map: Record<string, string> = {}
        for (const st of cfg) map[st.key] = st.value
        if (map.supportPhone) setSupportPhone(map.supportPhone)
        if (map.certificationPrice) setCertPrice(map.certificationPrice)
        if (map.trialDaysFirst) setTrialFirst(map.trialDaysFirst)
        if (map.trialDaysExtra) setTrialExtra(map.trialDaysExtra)
        if (map.smtpHost) setSmtpHost(map.smtpHost)
        if (map.smtpPort) setSmtpPort(map.smtpPort)
        if (map.smtpUser) setSmtpUser(map.smtpUser)
        if (map.smtpPass) setSmtpPass(map.smtpPass)
        if (map.smtpFrom) setSmtpFrom(map.smtpFrom)
      }
      if (Array.isArray(pl)) setPlans(pl)
      if (Array.isArray(pc)) setPaymentCodes(pc)
      if (Array.isArray(rv)) setReviews(rv)
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (session.role !== 'admin') return
    // setTimeout: la carga inicial no debe correr como setState síncrono del effect
    const t = setTimeout(() => {
      void loadAll()
    }, 0)
    return () => clearTimeout(t)
  }, [session.role, loadAll])

  // === Búsquedas en tablas ===
  const norm = (s: string) => s.toLowerCase().trim()

  const filteredBusinesses = useMemo(() => {
    const q = norm(bizSearch)
    if (!q) return businesses
    return businesses.filter((b) =>
      [b.name, b.slug, b.owner.name, b.owner.username, b.category.name, b.address || '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [businesses, bizSearch])

  const filteredOwners = useMemo(() => {
    const q = norm(ownerSearch)
    if (!q) return owners
    return owners.filter((o) =>
      [o.name, o.username, o.email || '', o.phone || ''].join(' ').toLowerCase().includes(q)
    )
  }, [owners, ownerSearch])

  const filteredLicenses = useMemo(() => {
    const q = norm(licSearch)
    if (!q) return licenses
    return licenses.filter((l) =>
      [l.business.name, l.business.slug].join(' ').toLowerCase().includes(q)
    )
  }, [licenses, licSearch])

  // === Códigos de pago (asesor) ===
  const applyPaymentCode = async (code?: string) => {
    const c = (code ?? payCodeInput).trim()
    if (!/^\d{6}$/.test(c)) {
      toast.error('Introduce un código de 6 dígitos')
      return
    }
    setApplyingCode(true)
    try {
      const res = await fetch('/api/admin/payment-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      toast.success(`Pago aplicado a ${data.business}`, {
        description: `Plan ${data.plan} · ${data.durationDays} días · vence ${new Date(data.endDate).toLocaleDateString('es-ES')}`,
      })
      setPayCodeInput('')
      void loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Error al aplicar el código')
    } finally {
      setApplyingCode(false)
    }
  }

  const rejectPaymentCode = async (id: string) => {
    try {
      const res = await fetch('/api/admin/payment-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error')
      toast.success('Código rechazado')
      void loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  // === Acciones ===
  const saveSettings = async () => {
    try {
      const entries: Array<[string, string]> = [
        ['supportPhone', supportPhone.trim()],
        ['certificationPrice', String(Math.max(0, Number(certPrice) || 0))],
        ['trialDaysFirst', String(Math.max(1, Number(trialFirst) || 30))],
        ['trialDaysExtra', String(Math.max(1, Number(trialExtra) || 5))],
        ['smtpHost', smtpHost.trim()],
        ['smtpPort', String(Number(smtpPort) || 465)],
        ['smtpUser', smtpUser.trim()],
        ['smtpPass', smtpPass],
        ['smtpFrom', smtpFrom.trim() || smtpUser.trim()],
      ]
      for (const [key, value] of entries) {
        const res = await fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key, value }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
      }
      toast.success('Ajustes guardados')
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    }
  }

  // Cambiar mi propia contraseña (admin logueado)
  const changeMyPassword = async () => {
    if (!currentPwd || !myNewPwd) {
      toast.error('Completa ambos campos')
      return
    }
    if (myNewPwd.length < 4) {
      toast.error('La contraseña nueva debe tener al menos 4 caracteres')
      return
    }
    if (myNewPwd !== myNewPwd2) {
      toast.error('Las contraseñas nuevas no coinciden')
      return
    }
    setSavingMyPwd(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: myNewPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Tu contraseña fue actualizada')
      setCurrentPwd('')
      setMyNewPwd('')
      setMyNewPwd2('')
    } catch (e: any) {
      toast.error(e.message || 'Error al cambiar la contraseña')
    } finally {
      setSavingMyPwd(false)
    }
  }

  // Cambiar la contraseña de un dueño
  const changeOwnerPassword = async () => {
    if (!pwdOwner) return
    if (!newPwd || newPwd.length < 4) {
      toast.error('La contraseña debe tener al menos 4 caracteres')
      return
    }
    setSavingPwd(true)
    try {
      const res = await fetch('/api/admin/owners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pwdOwner.id, password: newPwd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Contraseña actualizada de @${pwdOwner.username}`)
      setPwdOwner(null)
      setNewPwd('')
    } catch (e: any) {
      toast.error(e.message || 'Error al actualizar la contraseña')
    } finally {
      setSavingPwd(false)
    }
  }

  // Editar datos de un dueño (nombre, usuario, email, teléfono)
  const openEditOwner = (o: Owner) => {
    setEditOwner(o)
    setEditOwnerForm({
      name: o.name,
      username: o.username,
      email: o.email || '',
      phone: o.phone || '',
    })
  }

  const saveEditOwner = async () => {
    if (!editOwner) return
    if (!editOwnerForm.name.trim() || !editOwnerForm.username.trim()) {
      toast.error('Nombre y usuario son obligatorios')
      return
    }
    setSavingEditOwner(true)
    try {
      const res = await fetch('/api/admin/owners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editOwner.id, ...editOwnerForm }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Datos del dueño actualizados')
      setEditOwner(null)
      await loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSavingEditOwner(false)
    }
  }

  // Verificación manual de identidad de un dueño (por el admin)
  const verifyOwner = async (o: Owner) => {
    try {
      const res = await fetch('/api/admin/owners', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: o.id, emailVerified: true }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`@${o.username} marcado como verificado`)
      await loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Error al verificar')
    }
  }

  // Moderación de reseñas
  const openEditReview = (r: ReviewAdmin) => {
    setEditReview(r)
    setEditFormReview({
      rating: r.rating,
      comment: r.comment || '',
      customerName: r.customerName || '',
    })
  }

  const saveReview = async () => {
    if (!editReview) return
    setSavingReview(true)
    try {
      const res = await fetch('/api/admin/reviews', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editReview.id,
          rating: editFormReview.rating,
          comment: editFormReview.comment,
          customerName: editFormReview.customerName,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Reseña actualizada')
      setEditReview(null)
      await loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar la reseña')
    } finally {
      setSavingReview(false)
    }
  }

  const deleteReview = async (r: ReviewAdmin) => {
    if (!confirm('¿Eliminar esta reseña de forma definitiva?')) return
    try {
      const res = await fetch(`/api/admin/reviews?id=${r.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Reseña eliminada')
      await loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar')
    }
  }

  const createPlan = async () => {
    if (!planForm.name || !planForm.price || !planForm.durationDays) {
      toast.error('Completa nombre, precio y duración')
      return
    }
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: planForm.name,
          price: Number(planForm.price),
          durationDays: Number(planForm.durationDays),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlans((p) => [...p, data].sort((a, b) => a.durationDays - b.durationDays))
      setPlanForm({ name: '', durationDays: '30', price: '' })
      setShowPlanForm(false)
      toast.success('Plan creado')
    } catch (e: any) {
      toast.error(e.message || 'Error al crear')
    }
  }

  const savePlan = async (plan: { id: string; name: string; price: number; durationDays: number }) => {
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(plan),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlans((p) => p.map((x) => (x.id === data.id ? data : x)))
      toast.success('Plan actualizado')
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    }
  }

  const togglePlan = async (plan: Plan) => {
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plan.id, active: !plan.active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPlans((p) => p.map((x) => (x.id === data.id ? data : x)))
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  const createOwner = async () => {
    if (!ownerForm.username || !ownerForm.password || !ownerForm.name) {
      toast.error('Completa campos obligatorios')
      return
    }
    try {
      const res = await fetch('/api/admin/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ownerForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Dueño creado')
      setShowOwnerForm(false)
      setOwnerForm({ username: '', password: '', name: '', email: '', phone: '' })
      await loadAll()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const deleteOwner = async (id: string) => {
    if (!confirm('¿Eliminar este dueño y todos sus negocios?')) return
    try {
      await fetch(`/api/admin/owners?id=${id}`, { method: 'DELETE' })
      toast.success('Dueño eliminado')
      await loadAll()
    } catch {
      toast.error('Error')
    }
  }

  // === Usuarios administradores ===
  const filteredAdmins = useMemo(() => {
    if (!userSearch) return admins
    const q = userSearch.toLowerCase()
    return admins.filter((a) => a.name.toLowerCase().includes(q) || a.username.toLowerCase().includes(q))
  }, [admins, userSearch])

  // Slices paginados (20 por página)
  const bizPages = Math.max(1, Math.ceil(filteredBusinesses.length / TABLE_PAGE_SIZE))
  const pagedBusinesses = filteredBusinesses.slice((Math.min(bizPage, bizPages) - 1) * TABLE_PAGE_SIZE, Math.min(bizPage, bizPages) * TABLE_PAGE_SIZE)
  const ownerPages = Math.max(1, Math.ceil(filteredOwners.length / TABLE_PAGE_SIZE))
  const pagedOwners = filteredOwners.slice((Math.min(ownerPage, ownerPages) - 1) * TABLE_PAGE_SIZE, Math.min(ownerPage, ownerPages) * TABLE_PAGE_SIZE)
  const licPages = Math.max(1, Math.ceil(filteredLicenses.length / TABLE_PAGE_SIZE))
  const pagedLicenses = filteredLicenses.slice((Math.min(licPage, licPages) - 1) * TABLE_PAGE_SIZE, Math.min(licPage, licPages) * TABLE_PAGE_SIZE)
  const reviewPages = Math.max(1, Math.ceil(reviews.length / TABLE_PAGE_SIZE))
  const pagedReviews = reviews.slice((Math.min(reviewPage, reviewPages) - 1) * TABLE_PAGE_SIZE, Math.min(reviewPage, reviewPages) * TABLE_PAGE_SIZE)
  const userPages = Math.max(1, Math.ceil(filteredAdmins.length / TABLE_PAGE_SIZE))
  const pagedAdmins = filteredAdmins.slice((Math.min(userPage, userPages) - 1) * TABLE_PAGE_SIZE, Math.min(userPage, userPages) * TABLE_PAGE_SIZE)

  const createAdmin = async () => {
    if (!adminForm.name || !adminForm.username || !adminForm.password) {
      toast.error('Completa campos obligatorios')
      return
    }
    setSavingAdmin(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Usuario admin creado')
      setShowAdminForm(false)
      setAdminForm({ name: '', username: '', password: '' })
      await loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Error')
    } finally {
      setSavingAdmin(false)
    }
  }

  const openEditAdmin = (a: AdminUser) => {
    setEditAdmin(a)
    setEditAdminForm({ name: a.name, username: a.username, password: '' })
  }

  const saveEditAdmin = async () => {
    if (!editAdmin) return
    if (!editAdminForm.name.trim() || !editAdminForm.username.trim()) {
      toast.error('Nombre y usuario son obligatorios')
      return
    }
    setSavingAdmin(true)
    try {
      const body: Record<string, string> = {
        id: editAdmin.id,
        name: editAdminForm.name,
        username: editAdminForm.username,
      }
      if (editAdminForm.password) body.password = editAdminForm.password
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Usuario actualizado')
      setEditAdmin(null)
      await loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Error')
    } finally {
      setSavingAdmin(false)
    }
  }

  const deleteAdmin = async (id: string) => {
    if (!confirm('¿Eliminar este usuario administrador?')) return
    try {
      const res = await fetch(`/api/admin/users?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Usuario eliminado')
      await loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  const createBusiness = async () => {
    const finalSlug = bizForm.slug || slugify(bizForm.name)
    if (!bizForm.name || !finalSlug || !bizForm.ownerId || !bizForm.categoryId) {
      toast.error('Completa campos obligatorios')
      return
    }
    try {
      const res = await fetch('/api/admin/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...bizForm, slug: finalSlug }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Negocio creado')
      setShowBizForm(false)
      setBizForm({ name: '', slug: '', description: '', address: '', province: '', phone: '', email: '', ownerId: '', categoryId: '', licenseDays: '30' })
      await loadAll()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const deleteBusiness = async (id: string) => {
    if (!confirm('¿Eliminar este negocio y todos sus datos?')) return
    try {
      await fetch(`/api/admin/businesses?id=${id}`, { method: 'DELETE' })
      toast.success('Negocio eliminado')
      await loadAll()
    } catch {
      toast.error('Error')
    }
  }

  const extendLicense = async () => {
    if (!licForm.businessId || !licForm.addDays) {
      toast.error('Indica negocio y días')
      return
    }
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: licForm.businessId,
          addDays: Number(licForm.addDays),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(`Licencia extendida ${licForm.addDays} días`)
      setShowLicForm(false)
      setLicForm({ businessId: '', addDays: '30' })
      await loadAll()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const toggleLicense = async (businessId: string, action: 'activate' | 'deactivate') => {
    try {
      const res = await fetch('/api/admin/licenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, action }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Licencia ${action === 'activate' ? 'activada' : 'desactivada'}`)
      await loadAll()
    } catch {
      toast.error('Error')
    }
  }

  const openCatForm = (c?: Category) => {
    setCatForm(
      c
        ? { id: c.id, name: c.name, slug: c.slug, icon: c.icon || '', description: c.description || '' }
        : { id: '', name: '', slug: '', icon: '', description: '' }
    )
    setShowCatForm(true)
  }

  const saveCategory = async () => {
    if (!catForm.name.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }
    try {
      const isEdit = Boolean(catForm.id)
      const res = await fetch('/api/admin/categories', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(catForm),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(isEdit ? 'Categoría actualizada' : 'Categoría creada')
      setShowCatForm(false)
      await loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Error')
    }
  }

  const deleteCategory = async (id: string) => {
    if (!confirm('¿Eliminar esta categoría? Solo es posible si no tiene negocios asociados.')) return
    try {
      const res = await fetch(`/api/admin/categories?id=${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Categoría eliminada')
      await loadAll()
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar')
    }
  }

  // Si la sesión sigue cargando, mostrar skeleton
  if (authLoading || session.role === null) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    )
  }

  if (session.role !== 'admin') {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Acceso restringido a administradores.</p>
        <Button className="mt-4" onClick={() => navigate('/login')}>Iniciar sesión como root</Button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        <div className="grid md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />)}
        </div>
      </div>
    )
  }

  const totalActiveLicenses = licenses.filter((l) => l.active && new Date(l.endDate) > new Date()).length
  const expiringSoon = licenses.filter((l) => {
    const days = (new Date(l.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    return l.active && days > 0 && days <= 7
  })
  const expired = licenses.filter((l) => l.active && new Date(l.endDate) < new Date())

  const openBusinessDetail = (id: string) => {
    const b = businesses.find((x) => x.id === id)
    if (b) setDetailBusiness(b)
  }

  const weekDelta =
    stats && stats.appointmentsLastWeek > 0
      ? Math.round(
          ((stats.appointmentsThisWeek - stats.appointmentsLastWeek) /
            stats.appointmentsLastWeek) *
            100
        )
      : null

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Panel de administración</h1>
          <p className="text-sm text-muted-foreground">Gestión de negocios, dueños, categorías, licencias y analítica</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        {/* En móvil: barra de tabs fija al fondo (tipo app); en desktop: fila superior */}
        <TabsList className="fixed inset-x-0 bottom-0 z-40 grid h-16 w-full grid-cols-7 gap-1 rounded-none border-t border-border bg-background/95 p-1.5 pb-[calc(env(safe-area-inset-bottom)+6px)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:static sm:z-auto sm:h-auto sm:w-full sm:grid-cols-4 sm:gap-0 sm:rounded-lg sm:border-t-0 sm:shadow-none sm:p-[3px] md:grid-cols-7">
          <TabsTrigger value="overview" className="flex-col gap-0.5 sm:flex-row sm:gap-1.5">
            <LayoutDashboard className="h-4 w-4" />
            <span className="text-[9px] leading-none sm:hidden">Resumen</span>
            <span className="hidden text-xs sm:inline">Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="businesses" className="flex-col gap-0.5 sm:flex-row sm:gap-1.5">
            <Building2 className="h-4 w-4" />
            <span className="text-[9px] leading-none sm:hidden">Negoc</span>
            <span className="hidden text-xs sm:inline">Negocios</span>
          </TabsTrigger>
          <TabsTrigger value="owners" className="flex-col gap-0.5 sm:flex-row sm:gap-1.5">
            <Users className="h-4 w-4" />
            <span className="text-[9px] leading-none sm:hidden">Dueños</span>
            <span className="hidden text-xs sm:inline">Dueños</span>
          </TabsTrigger>
          <TabsTrigger value="users" className="flex-col gap-0.5 sm:flex-row sm:gap-1.5">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-[9px] leading-none sm:hidden">Usuarios</span>
            <span className="hidden text-xs sm:inline">Usuarios</span>
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex-col gap-0.5 sm:flex-row sm:gap-1.5">
            <Tags className="h-4 w-4" />
            <span className="text-[9px] leading-none sm:hidden">Categor</span>
            <span className="hidden text-xs sm:inline">Categorías</span>
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex-col gap-0.5 sm:flex-row sm:gap-1.5">
            <MessageSquare className="h-4 w-4" />
            <span className="text-[9px] leading-none sm:hidden">Reseñ</span>
            <span className="hidden text-xs sm:inline">Reseñas</span>
          </TabsTrigger>
          <TabsTrigger value="licenses" className="flex-col gap-0.5 sm:flex-row sm:gap-1.5">
            <KeyRound className="h-4 w-4" />
            <span className="text-[9px] leading-none sm:hidden">Licen</span>
            <span className="hidden text-xs sm:inline">Licencias</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex-col gap-0.5 sm:flex-row sm:gap-1.5">
            <Settings className="h-4 w-4" />
            <span className="text-[9px] leading-none sm:hidden">Ajustes</span>
            <span className="hidden text-xs sm:inline">Ajustes</span>
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4">
          {/* KPIs clickeables: cada card lleva a su tab */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
            <KpiCard
              icon={Building2}
              label="Negocios"
              value={businesses.length}
              sub="Ver listado completo"
              onClick={() => setTab('businesses')}
            />
            <KpiCard
              icon={Users}
              label="Dueños"
              value={owners.length}
              sub="Ver listado completo"
              onClick={() => setTab('owners')}
            />
            <KpiCard
              icon={Tags}
              label="Categorías"
              value={categories.length}
              sub="Crear y editar"
              onClick={() => setTab('categories')}
            />
            <KpiCard
              icon={KeyRound}
              label="Licencias activas"
              value={totalActiveLicenses}
              tone="text-green-600"
              sub="Ver licencias"
              onClick={() => setTab('licenses')}
            />
            <KpiCard
              icon={AlertTriangle}
              label="Por expirar"
              value={expiringSoon.length + expired.length}
              tone="text-amber-600"
              sub="Revisar urgente"
              onClick={() => setTab('licenses')}
            />
          </div>

          {expired.length > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="text-red-700 text-lg flex items-center gap-2">
                  <XCircle className="h-5 w-5" />
                  Licencias expiradas ({expired.length})
                </CardTitle>
                <CardDescription>Estos negocios no aparecen en el catálogo público</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {expired.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <div className="font-medium">{l.business.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Expiró: {new Date(l.endDate).toLocaleDateString('es-ES')}
                      </div>
                    </div>
                    <Button size="sm" onClick={() => toggleLicense(l.businessId, 'activate')}>
                      Renovar / Reactivar
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {expiringSoon.length > 0 && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="text-amber-700 text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Por expirar pronto ({expiringSoon.length})
                </CardTitle>
                <CardDescription>Renueva antes de que caduquen</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {expiringSoon.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3 border rounded-lg bg-white">
                    <div>
                      <div className="font-medium">{l.business.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Expira en {Math.ceil((new Date(l.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} días
                      </div>
                    </div>
                    <Button size="sm" onClick={() => {
                      setLicForm({ businessId: l.businessId, addDays: '30' })
                      setShowLicForm(true)
                    }}>
                      Extender
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* ANALÍTICA */}
          {stats && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 text-xl font-semibold">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Analítica para toma de decisiones
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
                    <CalendarCheck className="h-3.5 w-3.5" />
                    {stats.appointmentsThisWeek} citas esta semana
                  </span>
                  {weekDelta !== null && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${weekDelta >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      <TrendingUp className={`h-3.5 w-3.5 ${weekDelta < 0 ? 'rotate-180' : ''}`} />
                      {weekDelta >= 0 ? '+' : ''}{weekDelta}% vs sem. anterior
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                    <Eye className="h-3.5 w-3.5" />
                    {stats.totals.visits} visitas totales
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                    <Wallet className="h-3.5 w-3.5" />
                    ${stats.totals.appointments > 0
                      ? Object.values(stats.businessMetrics).reduce((a, m) => a + m.revenue, 0).toLocaleString('es-ES')
                      : 0}{' '}
                    completados
                  </span>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {/* Citas por día */}
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Citas agendadas — últimos 30 días</CardTitle>
                    <CardDescription>Volumen diario de reservas</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{ citas: { label: 'Citas', color: 'var(--chart-1)' } }}
                      className="h-[220px] w-full"
                    >
                      <AreaChart data={stats.appointmentsByDay} margin={{ left: -18, right: 8, top: 4 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          tickFormatter={(v: string) => {
                            const [, m, d] = v.split('-')
                            return `${Number(d)}/${Number(m)}`
                          }}
                          interval="preserveStartEnd"
                        />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Area
                          dataKey="count"
                          type="monotone"
                          fill="var(--color-citas)"
                          stroke="var(--color-citas)"
                          fillOpacity={0.2}
                          name="Citas"
                        />
                      </AreaChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Citas por estado */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Citas por estado</CardTitle>
                    <CardDescription>{stats.totals.appointments} en total</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer
                      config={{
                        pendiente: { label: 'Pendiente', color: STATUS_COLORS.pendiente },
                        confirmada: { label: 'Confirmada', color: STATUS_COLORS.confirmada },
                        completada: { label: 'Completada', color: STATUS_COLORS.completada },
                        cancelada: { label: 'Cancelada', color: STATUS_COLORS.cancelada },
                      }}
                      className="h-[220px] w-full"
                    >
                      <BarChart data={stats.appointmentsByStatus} margin={{ left: -18, right: 8, top: 4 }}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis
                          dataKey="status"
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v: string) => STATUS_LABELS[v] || v}
                        />
                        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]} name="Citas">
                          {stats.appointmentsByStatus.map((s) => (
                            <Cell key={s.status} fill={STATUS_COLORS[s.status] || 'var(--chart-2)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Top visitados (click → detalle del negocio) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Negocios más visitados</CardTitle>
                    <CardDescription>Click en una barra para ver el detalle</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.topBusinessesByVisits.length === 0 ? (
                      <p className="py-10 text-center text-sm text-muted-foreground">
                        Aún no hay visitas registradas.
                      </p>
                    ) : (
                      <ChartContainer
                        config={{ visitas: { label: 'Visitas', color: 'var(--chart-4)' } }}
                        className="h-[220px] w-full"
                      >
                        <BarChart
                          data={stats.topBusinessesByVisits}
                          layout="vertical"
                          margin={{ left: 4, right: 16, top: 4 }}
                        >
                          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={96}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: string) => truncLabel(v)}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar
                            dataKey="count"
                            fill="var(--color-visitas)"
                            radius={[0, 6, 6, 0]}
                            name="Visitas"
                            cursor="pointer"
                            onClick={(data: any) => data?.id && openBusinessDetail(data.id)}
                          />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Top agendados (click → detalle del negocio) */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Negocios más agendados</CardTitle>
                    <CardDescription>Click en una barra para ver el detalle</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.topBusinessesByAppointments.length === 0 ? (
                      <p className="py-10 text-center text-sm text-muted-foreground">
                        Aún no hay citas registradas.
                      </p>
                    ) : (
                      <ChartContainer
                        config={{ citas: { label: 'Citas', color: 'var(--chart-1)' } }}
                        className="h-[220px] w-full"
                      >
                        <BarChart
                          data={stats.topBusinessesByAppointments}
                          layout="vertical"
                          margin={{ left: 4, right: 16, top: 4 }}
                        >
                          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={96}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: string) => truncLabel(v)}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar
                            dataKey="count"
                            fill="var(--color-citas)"
                            radius={[0, 6, 6, 0]}
                            name="Citas"
                            cursor="pointer"
                            onClick={(data: any) => data?.id && openBusinessDetail(data.id)}
                          />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Servicios más agendados */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Servicios más agendados</CardTitle>
                    <CardDescription>Demanda por tipo de servicio</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {stats.topServices.length === 0 ? (
                      <p className="py-10 text-center text-sm text-muted-foreground">
                        Aún no hay citas registradas.
                      </p>
                    ) : (
                      <ChartContainer
                        config={{ citas: { label: 'Citas', color: 'var(--chart-2)' } }}
                        className="h-[220px] w-full"
                      >
                        <BarChart
                          data={stats.topServices}
                          layout="vertical"
                          margin={{ left: 4, right: 16, top: 4 }}
                        >
                          <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={110}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(v: string) => truncLabel(v, 16)}
                          />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="count" fill="var(--color-citas)" radius={[0, 6, 6, 0]} name="Citas" />
                        </BarChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>

        {/* NEGOCIOS */}
        <TabsContent value="businesses" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{businesses.length} negocios</h2>
            <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
              <Input
                value={bizSearch}
                onChange={(e) => { setBizSearch(e.target.value); setBizPage(1) }}
                placeholder="Buscar negocio, dueño o categoría..."
              />
            </div>
            <Button onClick={() => setShowBizForm(true)}>
              <Plus className="h-4 w-4 mr-1" />Nuevo negocio
            </Button>
          </div>
          {bizSearch && (
            <p className="text-xs text-muted-foreground">
              {filteredBusinesses.length} resultado(s) para “{bizSearch}”
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pagedBusinesses.map((b) => (
              <Card
                key={b.id}
                className="flex cursor-pointer flex-col transition-all hover:border-primary/40 hover:shadow-md"
                onClick={() => setDetailBusiness(b)}
              >
                <CardContent className="p-4 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold">{b.name}</h3>
                      <p className="text-xs text-muted-foreground">/{b.slug}</p>
                    </div>
                    {b.license && (
                      <Badge variant={b.license.active && new Date(b.license.endDate) > new Date() ? 'default' : 'destructive'}>
                        {b.license.active && new Date(b.license.endDate) > new Date() ? 'ACTIVO' : 'EXPIRADO'}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>📦 {b.category.name}</div>
                    <div>👤 {b.owner.name} (@{b.owner.username})</div>
                    <div>💅 {b._count?.services || 0} servicios · {b._count?.appointments || 0} citas</div>
                    {b.license && (
                      <div className="flex items-center gap-1">
                        <CalIcon className="h-3 w-3" />
                        Vence: {new Date(b.license.endDate).toLocaleDateString('es-ES')}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 pt-2 border-t" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/negocio/${b.slug}`)}
                    >
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate(`/negocio/${b.slug}/panel`)}
                    >
                      Panel
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteBusiness(b.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <TablePager total={filteredBusinesses.length} page={bizPage} onPage={setBizPage} />
        </TabsContent>

        {/* DUEÑOS */}
        <TabsContent value="owners" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{owners.length} dueños</h2>
            <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
              <Input
                value={ownerSearch}
                onChange={(e) => { setOwnerSearch(e.target.value); setOwnerPage(1) }}
                placeholder="Buscar dueño por nombre, usuario o teléfono..."
              />
            </div>
            <Button onClick={() => setShowOwnerForm(true)}>
              <Plus className="h-4 w-4 mr-1" />Nuevo dueño
            </Button>
          </div>
          {ownerSearch && (
            <p className="text-xs text-muted-foreground">
              {filteredOwners.length} resultado(s) para “{ownerSearch}”
            </p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pagedOwners.map((o) => (
              <Card key={o.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{o.name}</h3>
                      <p className="text-xs text-muted-foreground">@{o.username}</p>
                    </div>
                    <Badge variant="secondary">{o._count?.businesses || 0} negocios</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    {o.email ? (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>✉️ {o.email}</span>
                        {o.emailVerified ? (
                          <Badge className="bg-green-600 h-5 text-[10px] px-1.5">
                            <UserCheck className="h-3 w-3 mr-0.5" />Verificado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 h-5 text-[10px] px-1.5">
                            Sin verificar
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span>Sin email</span>
                        {!o.emailVerified && (
                          <Badge variant="outline" className="border-amber-500 text-amber-600 h-5 text-[10px] px-1.5">
                            Sin verificar
                          </Badge>
                        )}
                      </div>
                    )}
                    {o.phone && <div>📞 {o.phone}</div>}
                    <div>📅 {new Date(o.createdAt).toLocaleDateString('es-ES')}</div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {o.phone && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-green-600 text-green-700 hover:bg-green-50"
                        onClick={() => {
                          const digits = o.phone!.replace(/[^0-9]/g, '')
                          window.open(
                            `https://wa.me/${digits}?text=${encodeURIComponent(`Hola ${o.name}, soy el equipo de AgendaT.`)}`,
                            '_blank'
                          )
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />WhatsApp
                      </Button>
                    )}
                    {!o.emailVerified && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-green-600 text-green-700 hover:bg-green-50"
                        onClick={() => verifyOwner(o)}
                      >
                        <UserCheck className="h-4 w-4 mr-1" />Verificar
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => openEditOwner(o)}
                    >
                      <Pencil className="h-4 w-4 mr-1" />Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setPwdOwner(o)
                        setNewPwd('')
                      }}
                    >
                      <Lock className="h-4 w-4 mr-1" />Contraseña
                    </Button>
                    <Button size="sm" variant="ghost" className="flex-1 text-destructive" onClick={() => deleteOwner(o.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <TablePager total={filteredOwners.length} page={ownerPage} onPage={setOwnerPage} />
        </TabsContent>

        {/* USUARIOS ADMIN */}
        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{admins.length} administrador{admins.length === 1 ? '' : 'es'}</h2>
            <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
              <Input
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setUserPage(1) }}
                placeholder="Buscar usuario por nombre o usuario..."
              />
            </div>
            <Button onClick={() => { setAdminForm({ name: '', username: '', password: '' }); setShowAdminForm(true) }}>
              <Plus className="h-4 w-4 mr-1" />Nuevo usuario
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Cuentas con acceso al panel de administración. Pueden iniciar sesión en /admin con su usuario y contraseña.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pagedAdmins.map((a) => {
              const isMe = a.id === session.adminId
              return (
                <Card key={a.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold flex items-center gap-1.5">
                          {a.name}
                          {isMe && <Badge variant="secondary" className="text-[10px]">Tú</Badge>}
                        </h3>
                        <p className="text-xs text-muted-foreground">@{a.username}</p>
                      </div>
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>📅 {new Date(a.createdAt).toLocaleDateString('es-ES')}</div>
                    </div>
                    <div className="flex gap-2 flex-wrap pt-1">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditAdmin(a)}>
                        <Pencil className="h-4 w-4 mr-1" />Editar
                      </Button>
                      {!isMe && (
                        <Button size="sm" variant="ghost" className="flex-1 text-destructive" onClick={() => deleteAdmin(a.id)}>
                          <Trash2 className="h-4 w-4 mr-1" />Eliminar
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {pagedAdmins.length === 0 && (
              <p className="text-sm text-muted-foreground col-span-full text-center py-6">
                {userSearch ? 'Sin resultados para la búsqueda.' : 'No hay usuarios administradores.'}
              </p>
            )}
          </div>
          <TablePager total={filteredAdmins.length} page={userPage} onPage={setUserPage} />
        </TabsContent>

        {/* CATEGORÍAS */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">{categories.length} categorías</h2>
            <Button onClick={() => openCatForm()}>
              <Plus className="h-4 w-4 mr-1" />Nueva categoría
            </Button>
          </div>
          {categories.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-muted-foreground">
                No hay categorías. Crea la primera para poder clasificar negocios.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {categories.map((c) => {
                return (
                  <Card key={c.id} className="flex flex-col">
                    <CardContent className="p-4 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                            <CategoryIcon name={c.icon} className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{c.name}</h3>
                            <p className="text-xs text-muted-foreground">/{c.slug}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">{c._count?.businesses || 0} negocios</Badge>
                      </div>
                      {c.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>
                      )}
                      <p className="text-[11px] text-muted-foreground">Icono: <code>{c.icon || '—'}</code></p>
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openCatForm(c)}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => deleteCategory(c.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* LICENCIAS */}
        <TabsContent value="licenses" className="space-y-4">
          {/* Planes de suscripción (precios visibles en el tab Licencia del dueño) */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Planes de suscripción</CardTitle>
                <CardDescription>
                  Ofertas y precios que verán los dueños en su tab Licencia
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setShowPlanForm(!showPlanForm)}>
                <Plus className="h-4 w-4 mr-1" />Nuevo plan
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {showPlanForm && (
                <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nombre *</Label>
                      <Input
                        value={planForm.name}
                        onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                        placeholder="Trimestral"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Duración (días) *</Label>
                      <Input
                        type="number"
                        value={planForm.durationDays}
                        onChange={(e) => setPlanForm({ ...planForm, durationDays: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Precio (CUP) *</Label>
                      <Input
                        type="number"
                        value={planForm.price}
                        onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                        placeholder="1500"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={createPlan}>Crear plan</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowPlanForm(false)}>Cancelar</Button>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {plans.map((p) => (
                  <PlanCard key={p.id} plan={p} onSave={savePlan} onToggle={togglePlan} />
                ))}
                {plans.length === 0 && (
                  <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                    Sin planes. Crea el primero.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Códigos de pago generados por los dueños (al elegir un plan) */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-primary" />Códigos de pago
                  </CardTitle>
                  <CardDescription>
                    Los dueños generan un código de 6 dígitos al elegir un plan y lo envían por WhatsApp.
                    Introdlúcelo aquí para aplicar el pago y activar la licencia.
                  </CardDescription>
                </div>
                {paymentCodes.some((pc) => pc.status !== 'pendiente') && (
                  <Button size="sm" variant="outline" onClick={() => setShowCodeHistory(!showCodeHistory)}>
                    {showCodeHistory ? 'Ocultar histórico' : 'Histórico'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Input
                  value={payCodeInput}
                  onChange={(e) => setPayCodeInput(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  className="w-36 font-mono text-center tracking-[0.3em]"
                  maxLength={6}
                />
                <Button
                  onClick={() => applyPaymentCode()}
                  disabled={applyingCode || payCodeInput.length !== 6}
                >
                  {applyingCode ? 'Aplicando...' : 'Aplicar pago'}
                </Button>
              </div>
              {(() => {
                const visibleCodes = showCodeHistory
                  ? paymentCodes
                  : paymentCodes.filter((pc) => pc.status === 'pendiente')
                if (visibleCodes.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      {showCodeHistory ? 'Aún no hay códigos generados.' : 'No hay códigos pendientes.'}
                    </p>
                  )
                }
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b bg-muted/30">
                        <tr>
                          <th className="text-left p-2 font-medium">Código</th>
                          <th className="text-left p-2 font-medium">Negocio</th>
                          <th className="text-left p-2 font-medium">Plan</th>
                          <th className="text-right p-2 font-medium">Precio</th>
                          <th className="text-center p-2 font-medium">Estado</th>
                          <th className="text-center p-2 font-medium">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleCodes.map((pc) => (
                          <tr key={pc.id} className="border-b">
                            <td className="p-2 font-mono font-bold tracking-widest">{pc.code}</td>
                            <td className="p-2">
                              <div>{pc.business.name}</div>
                              <div className="text-xs text-muted-foreground">/{pc.business.slug}</div>
                            </td>
                            <td className="p-2">
                              {pc.kind === 'certificacion' ? (
                                <Badge className="bg-blue-600">Certificación</Badge>
                              ) : (
                                <>{pc.planName} · {pc.durationDays}d</>
                              )}
                            </td>
                            <td className="p-2 text-right">${pc.price.toLocaleString('es-ES')}</td>
                            <td className="p-2 text-center">
                              {pc.status === 'pendiente' ? (
                                <Badge variant="secondary">Pendiente</Badge>
                              ) : pc.status === 'pagada' ? (
                                <Badge className="bg-green-600">Pagada</Badge>
                              ) : (
                                <Badge variant="destructive">Rechazada</Badge>
                              )}
                            </td>
                            <td className="p-2 text-center">
                              {pc.status === 'pendiente' && (
                                <div className="flex items-center justify-center gap-1">
                                  <Button size="sm" onClick={() => applyPaymentCode(pc.code)}>
                                    Aplicar
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => rejectPaymentCode(pc.id)}>
                                    Rechazar
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              })()}
            </CardContent>
          </Card>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{licenses.length} licencias</h2>
            <div className="flex items-center gap-2 flex-1 min-w-[220px] max-w-sm">
              <Input
                value={licSearch}
                onChange={(e) => { setLicSearch(e.target.value); setLicPage(1) }}
                placeholder="Buscar licencia por negocio..."
              />
            </div>
            <Button onClick={() => setShowLicForm(true)}>
              <Plus className="h-4 w-4 mr-1" />Extender licencia
            </Button>
          </div>
          {licSearch && (
            <p className="text-xs text-muted-foreground">
              {filteredLicenses.length} resultado(s) para “{licSearch}”
            </p>
          )}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/30">
                    <tr>
                      <th className="text-left p-3 font-medium">Negocio</th>
                      <th className="text-left p-3 font-medium">Inicio</th>
                      <th className="text-left p-3 font-medium">Fin</th>
                      <th className="text-center p-3 font-medium">Duración</th>
                      <th className="text-center p-3 font-medium">Estado</th>
                      <th className="text-center p-3 font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedLicenses.map((l) => {
                      const licExpired = new Date(l.endDate) < new Date()
                      const isExpiring = !licExpired && (new Date(l.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24) <= 7
                      return (
                        <tr key={l.id} className="border-b hover:bg-muted/30">
                          <td className="p-3">
                            <div className="font-medium">{l.business.name}</div>
                            <div className="text-xs text-muted-foreground">/{l.business.slug}</div>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(l.startDate).toLocaleDateString('es-ES')}
                          </td>
                          <td className="p-3">
                            <div>{new Date(l.endDate).toLocaleDateString('es-ES')}</div>
                            {licExpired && <div className="text-xs text-red-600">Expirada</div>}
                            {isExpiring && <div className="text-xs text-amber-600">Próxima a expirar</div>}
                          </td>
                          <td className="p-3 text-center">{l.durationDays}d</td>
                          <td className="p-3 text-center">
                            {l.active ? (
                              <Badge variant="default" className="bg-green-600">Activa</Badge>
                            ) : (
                              <Badge variant="destructive">Inactiva</Badge>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setLicForm({ businessId: l.businessId, addDays: '30' })
                                  setShowLicForm(true)
                                }}
                              >
                                +Días
                              </Button>
                              {l.active ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleLicense(l.businessId, 'deactivate')}
                                >
                                  Desactivar
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleLicense(l.businessId, 'activate')}
                                >
                                  Activar
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <TablePager total={filteredLicenses.length} page={licPage} onPage={setLicPage} />
        </TabsContent>

        {/* AJUSTES */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" />Mi contraseña
              </CardTitle>
              <CardDescription>
                Cambia la contraseña de tu cuenta de administrador
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Contraseña actual</Label>
                  <Input
                    type="password"
                    value={currentPwd}
                    onChange={(e) => setCurrentPwd(e.target.value)}
                    autoComplete="current-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Contraseña nueva</Label>
                  <Input
                    type="password"
                    value={myNewPwd}
                    onChange={(e) => setMyNewPwd(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Repetir contraseña nueva</Label>
                  <Input
                    type="password"
                    value={myNewPwd2}
                    onChange={(e) => setMyNewPwd2(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <Button onClick={changeMyPassword} disabled={savingMyPwd}>
                <Save className="h-4 w-4 mr-1" />
                {savingMyPwd ? 'Guardando…' : 'Cambiar contraseña'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Headset className="h-5 w-5 text-primary" />Soporte a dueños
              </CardTitle>
              <CardDescription>
                Número de WhatsApp al que los dueños de negocios contactarán para pedir ayuda desde su panel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Número de soporte (con código de país)</Label>
                  <Input
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="+53 5 123 4567"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Vista previa del enlace</Label>
                  <div className="text-xs text-muted-foreground rounded-lg border p-2.5 break-all bg-muted/30">
                    {supportPhone
                      ? `https://wa.me/${supportPhone.replace(/[^0-9]/g, '')}`
                      : 'Se mostrará el botón de Soporte en el panel del dueño cuando guardes un número.'}
                  </div>
                </div>
              </div>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-1" />Guardar ajustes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" />Certificación y días de prueba
              </CardTitle>
              <CardDescription>
                Precio de la certificación del negocio (los dueños generan un código de pago como con
                las licencias) y días de prueba al crear un negocio nuevo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Precio de certificación (CUP)</Label>
                  <Input
                    value={certPrice}
                    onChange={(e) => setCertPrice(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Ej. 500"
                    inputMode="numeric"
                  />
                  <p className="text-xs text-muted-foreground">0 = certificación desactivada</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Días de prueba (primer negocio)</Label>
                  <Input
                    value={trialFirst}
                    onChange={(e) => setTrialFirst(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="30"
                    inputMode="numeric"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Días de prueba (negocios siguientes)</Label>
                  <Input
                    value={trialExtra}
                    onChange={(e) => setTrialExtra(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="5"
                    inputMode="numeric"
                  />
                </div>
              </div>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-1" />Guardar ajustes
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />Correo (SMTP) — verificación por email
              </CardTitle>
              <CardDescription>
                Envío de códigos OTP para registro y recuperación de contraseña. Sin configurar, la
                verificación se hace manualmente desde la pestaña Dueños.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSmtpHost('smtp.gmail.com')
                    setSmtpPort('465')
                  }}
                >
                  Plantilla Gmail
                </Button>
                <p className="text-xs text-muted-foreground">
                  Gmail: usa una <b>contraseña de aplicación</b> (Google Cuenta → Seguridad →
                  Contraseñas de aplicaciones), no tu contraseña normal.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Servidor (host)</Label>
                  <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="smtp.gmail.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Puerto</Label>
                  <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value.replace(/[^0-9]/g, ''))} placeholder="465" inputMode="numeric" />
                </div>
                <div className="space-y-1.5">
                  <Label>Usuario (email)</Label>
                  <Input type="email" value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="tu@gmail.com" />
                </div>
                <div className="space-y-1.5">
                  <Label>Contraseña de aplicación</Label>
                  <Input type="password" value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} placeholder="••••••••••••" autoComplete="off" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Remitente (opcional)</Label>
                  <Input value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="AgendaT <tu@gmail.com>" />
                </div>
              </div>
              <Button onClick={saveSettings}>
                <Save className="h-4 w-4 mr-1" />Guardar ajustes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* RESEÑAS (moderación antidifamación) */}
        <TabsContent value="reviews" className="space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-xl font-semibold">{reviews.length} reseñas</h2>
            <p className="text-xs text-muted-foreground">
              Edita o elimina reseñas ofensivas, falsas o difamatorias
            </p>
          </div>
          {reviews.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Aún no hay reseñas publicadas.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {pagedReviews.map((r) => (
                <Card key={r.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-sm">
                            {r.customerName || 'Cliente anónimo'}
                          </span>
                          <span className="inline-flex items-center gap-0.5 text-xs text-amber-500">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-3.5 w-3.5 ${i < r.rating ? 'fill-amber-400' : 'text-muted-foreground/40'}`}
                              />
                            ))}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {r.business.name} · {new Date(r.createdAt).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    {r.comment && (
                      <p className="text-sm bg-muted/50 rounded-lg p-2 whitespace-pre-wrap break-words">
                        {r.comment}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => openEditReview(r)}>
                        <Pencil className="h-4 w-4 mr-1" />Editar
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1 text-destructive" onClick={() => deleteReview(r)}>
                        <Trash2 className="h-4 w-4 mr-1" />Eliminar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
          <TablePager total={reviews.length} page={reviewPage} onPage={setReviewPage} />
        </TabsContent>
      </Tabs>

      {/* Dialog: detalle de negocio (click en cards o barras) */}
      <BusinessDetailDialog
        business={detailBusiness}
        metrics={detailBusiness ? stats?.businessMetrics[detailBusiness.id] : undefined}
        onClose={() => setDetailBusiness(null)}
        onVisit={(slug) => {
          setDetailBusiness(null)
          navigate(`/negocio/${slug}`)
        }}
        onPanel={(slug) => {
          setDetailBusiness(null)
          navigate(`/negocio/${slug}/panel`)
        }}
      />

      {/* Dialog: crear dueño */}
      <Dialog open={showOwnerForm} onOpenChange={setShowOwnerForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear dueño de negocio</DialogTitle>
            <DialogDescription>
              El dueño podrá luego acceder con su usuario/contraseña al panel de gestión
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input value={ownerForm.name} onChange={(e) => setOwnerForm({ ...ownerForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Usuario *</Label>
                <Input value={ownerForm.username} onChange={(e) => setOwnerForm({ ...ownerForm, username: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Contraseña *</Label>
                <Input value={ownerForm.password} onChange={(e) => setOwnerForm({ ...ownerForm, password: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono/WhatsApp</Label>
                <Input value={ownerForm.phone} onChange={(e) => setOwnerForm({ ...ownerForm, phone: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={ownerForm.email} onChange={(e) => setOwnerForm({ ...ownerForm, email: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOwnerForm(false)}>Cancelar</Button>
            <Button onClick={createOwner}>Crear dueño</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: cambiar contraseña de un dueño */}
      <Dialog open={!!pwdOwner} onOpenChange={(o) => { if (!o) { setPwdOwner(null); setNewPwd('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              {pwdOwner ? `@${pwdOwner.username} — ${pwdOwner.name}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Nueva contraseña</Label>
            <Input
              type="text"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              placeholder="Mínimo 4 caracteres"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPwdOwner(null); setNewPwd('') }}>
              Cancelar
            </Button>
            <Button onClick={changeOwnerPassword} disabled={savingPwd || newPwd.length < 4}>
              {savingPwd ? 'Guardando...' : 'Guardar contraseña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar datos de un dueño */}
      <Dialog open={!!editOwner} onOpenChange={(o) => { if (!o) setEditOwner(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar dueño</DialogTitle>
            <DialogDescription>
              Actualiza los datos de la cuenta del dueño
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={editOwnerForm.name}
                onChange={(e) => setEditOwnerForm({ ...editOwnerForm, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Usuario</Label>
              <Input
                value={editOwnerForm.username}
                onChange={(e) => setEditOwnerForm({ ...editOwnerForm, username: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={editOwnerForm.email}
                onChange={(e) => setEditOwnerForm({ ...editOwnerForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono/WhatsApp</Label>
              <Input
                value={editOwnerForm.phone}
                onChange={(e) => setEditOwnerForm({ ...editOwnerForm, phone: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOwner(null)}>Cancelar</Button>
            <Button onClick={saveEditOwner} disabled={savingEditOwner}>
              {savingEditOwner ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: crear usuario admin */}
      <Dialog open={showAdminForm} onOpenChange={setShowAdminForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo usuario administrador</DialogTitle>
            <DialogDescription>
              Esta cuenta podrá iniciar sesión en el panel de administración.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre *</Label>
              <Input
                value={adminForm.name}
                onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Usuario *</Label>
              <Input
                value={adminForm.username}
                onChange={(e) => setAdminForm({ ...adminForm, username: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña * (mín. 4 caracteres)</Label>
              <Input
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminForm(false)}>Cancelar</Button>
            <Button onClick={createAdmin} disabled={savingAdmin}>
              {savingAdmin ? 'Creando...' : 'Crear usuario'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar usuario admin */}
      <Dialog open={!!editAdmin} onOpenChange={(o) => { if (!o) setEditAdmin(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario administrador</DialogTitle>
            <DialogDescription>
              Actualiza los datos de la cuenta. Deja la contraseña vacía para no cambiarla.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre</Label>
              <Input
                value={editAdminForm.name}
                onChange={(e) => setEditAdminForm({ ...editAdminForm, name: e.target.value })}
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>Usuario</Label>
              <Input
                value={editAdminForm.username}
                onChange={(e) => setEditAdminForm({ ...editAdminForm, username: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nueva contraseña (opcional, mín. 4 caracteres)</Label>
              <Input
                type="password"
                value={editAdminForm.password}
                onChange={(e) => setEditAdminForm({ ...editAdminForm, password: e.target.value })}
                placeholder="Sin cambios"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditAdmin(null)}>Cancelar</Button>
            <Button onClick={saveEditAdmin} disabled={savingAdmin}>
              {savingAdmin ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: editar reseña (moderación) */}
      <Dialog open={!!editReview} onOpenChange={(o) => { if (!o) setEditReview(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar reseña</DialogTitle>
            <DialogDescription>
              {editReview ? `${editReview.business.name} — ${new Date(editReview.createdAt).toLocaleDateString('es-ES')}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre mostrado</Label>
              <Input
                value={editFormReview.customerName}
                onChange={(e) => setEditFormReview({ ...editFormReview, customerName: e.target.value })}
                placeholder="Cliente anónimo"
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Valoración</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setEditFormReview({ ...editFormReview, rating: v })}
                    aria-label={`${v} estrellas`}
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        v <= editFormReview.rating ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground/40'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Comentario</Label>
              <Textarea
                value={editFormReview.comment}
                onChange={(e) => setEditFormReview({ ...editFormReview, comment: e.target.value })}
                rows={4}
                maxLength={1000}
                placeholder="Texto de la reseña..."
              />
              <p className="text-xs text-muted-foreground">
                Puedes corregir o censurar contenido ofensivo sin eliminar la reseña.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditReview(null)}>Cancelar</Button>
            <Button onClick={saveReview} disabled={savingReview}>
              {savingReview ? 'Guardando...' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: crear negocio */}
      <Dialog open={showBizForm} onOpenChange={setShowBizForm}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Crear negocio</DialogTitle>
            <DialogDescription>
              Asigna un dueño y una categoría. Se generará licencia inicial.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  value={bizForm.name}
                  onChange={(e) =>
                    setBizForm({
                      ...bizForm,
                      name: e.target.value,
                      slug: slugify(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>URL pública (auto) *</Label>
                <Input
                  value={bizForm.slug ? `/negocio/${bizForm.slug}` : ''}
                  readOnly
                  className="bg-muted/50 cursor-not-allowed"
                  placeholder="Se genera desde el nombre"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input value={bizForm.description} onChange={(e) => setBizForm({ ...bizForm, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dueño *</Label>
                <Select value={bizForm.ownerId} onValueChange={(v) => setBizForm({ ...bizForm, ownerId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name} (@{o.username})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoría *</Label>
                <Select value={bizForm.categoryId} onValueChange={(v) => setBizForm({ ...bizForm, categoryId: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Dirección</Label>
                <Input value={bizForm.address} onChange={(e) => setBizForm({ ...bizForm, address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Teléfono</Label>
                <Input value={bizForm.phone} onChange={(e) => setBizForm({ ...bizForm, phone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Provincia</Label>
                <Select value={bizForm.province || 'none'} onValueChange={(v) => setBizForm({ ...bizForm, province: v === 'none' ? '' : v })}>
                  <SelectTrigger aria-label="Provincia"><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin provincia</SelectItem>
                    {CUBA_PROVINCES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Licencia inicial (días)</Label>
              <Input type="number" value={bizForm.licenseDays} onChange={(e) => setBizForm({ ...bizForm, licenseDays: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBizForm(false)}>Cancelar</Button>
            <Button onClick={createBusiness}>Crear negocio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: extender licencia */}
      <Dialog open={showLicForm} onOpenChange={setShowLicForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender licencia</DialogTitle>
            <DialogDescription>
              Añade días a la licencia del negocio seleccionado
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Negocio</Label>
              <Select value={licForm.businessId} onValueChange={(v) => setLicForm({ ...licForm, businessId: v })}>
                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Días a añadir</Label>
              <Input type="number" value={licForm.addDays} onChange={(e) => setLicForm({ ...licForm, addDays: e.target.value })} />
            </div>
            <div className="flex gap-2">
              {[7, 15, 30, 60, 90].map((d) => (
                <Button key={d} variant="outline" size="sm" onClick={() => setLicForm({ ...licForm, addDays: String(d) })}>
                  +{d}d
                </Button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLicForm(false)}>Cancelar</Button>
            <Button onClick={extendLicense}>Extender</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: crear/editar categoría */}
      <Dialog open={showCatForm} onOpenChange={setShowCatForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{catForm.id ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
            <DialogDescription>
              Las categorías organizan el catálogo público de negocios
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nombre *</Label>
                <Input
                  value={catForm.name}
                  onChange={(e) =>
                    setCatForm({
                      ...catForm,
                      name: e.target.value,
                      // auto-slug mientras no se edite una categoría existente
                      slug: catForm.id
                        ? catForm.slug
                        : e.target.value
                            .toLowerCase()
                            .normalize('NFD')
                            .replace(/[\u0300-\u036f]/g, '')
                            .replace(/[^a-z0-9]+/g, '-')
                            .replace(/^-+|-+$/g, ''),
                    })
                  }
                  placeholder="ej. Peluquería"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug (URL)</Label>
                <Input
                  value={catForm.slug}
                  onChange={(e) => setCatForm({ ...catForm, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="peluqueria"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Icono (Lucide)</Label>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <CategoryIcon name={catForm.icon} className="h-4 w-4 text-primary" />
                </div>
                <Input
                  value={catForm.icon}
                  onChange={(e) => setCatForm({ ...catForm, icon: e.target.value })}
                  placeholder="Scissors"
                />
              </div>
              <div className="flex flex-wrap gap-1 pt-1">
                {ICON_SUGGESTIONS.map((name) => {
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setCatForm({ ...catForm, icon: name })}
                      className={`rounded-md border p-1.5 transition-colors hover:bg-accent ${
                        catForm.icon === name ? 'border-primary bg-primary/10' : 'border-border'
                      }`}
                      title={name}
                    >
                      <CategoryIcon name={name} className="h-4 w-4" />
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descripción</Label>
              <Input
                value={catForm.description}
                onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
                placeholder="Cortes, peinados y tratamientos"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCatForm(false)}>Cancelar</Button>
            <Button onClick={saveCategory}>{catForm.id ? 'Guardar cambios' : 'Crear categoría'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ============================================================
// Subcomponentes
// ============================================================

const TABLE_PAGE_SIZE = 20

function TablePager({
  total,
  page,
  onPage,
}: {
  total: number
  page: number
  onPage: (p: number) => void
}) {
  const pages = Math.max(1, Math.ceil(total / TABLE_PAGE_SIZE))
  if (pages <= 1) return null
  const cur = Math.min(Math.max(1, page), pages)
  return (
    <div className="flex items-center justify-center gap-3 pt-2">
      <Button size="sm" variant="outline" disabled={cur <= 1} onClick={() => onPage(cur - 1)}>
        Anterior
      </Button>
      <span className="text-xs text-muted-foreground">
        Página {cur} de {pages} · {total} total
      </span>
      <Button size="sm" variant="outline" disabled={cur >= pages} onClick={() => onPage(cur + 1)}>
        Siguiente
      </Button>
    </div>
  )
}

function PlanCard({
  plan,
  onSave,
  onToggle,
}: {
  plan: Plan
  onSave: (p: { id: string; name: string; price: number; durationDays: number }) => void
  onToggle: (p: Plan) => void
}) {
  const [name, setName] = useState(plan.name)
  const [price, setPrice] = useState(String(plan.price))
  const [days, setDays] = useState(String(plan.durationDays))

  return (
    <div className={`border rounded-lg p-3 space-y-2 ${plan.active ? '' : 'opacity-60'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={`text-xs rounded-full px-2 py-0.5 ${plan.active ? 'bg-green-600 text-white' : 'bg-muted text-muted-foreground'}`}>
          {plan.active ? 'Activo' : 'Inactivo'}
        </span>
        <Switch checked={plan.active} onCheckedChange={() => onToggle(plan)} />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Nombre</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Precio (CUP)</Label>
          <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Días</Label>
          <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
      </div>
      <Button
        size="sm"
        className="w-full"
        onClick={() =>
          onSave({ id: plan.id, name, price: Number(price), durationDays: Number(days) })
        }
      >
        <Save className="h-4 w-4 mr-1" />Guardar precio
      </Button>
    </div>
  )
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'text-foreground',
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number | string
  sub?: string
  tone?: string
  onClick: () => void
}) {
  return (
    <button onClick={onClick} className="group w-full text-left focus:outline-none">
      <Card className="h-full transition-all group-hover:border-primary/40 group-hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Icon className="h-3 w-3" />
              {label}
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <div className={`mt-1 text-3xl font-bold ${tone}`}>{value}</div>
          {sub && <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>}
        </CardContent>
      </Card>
    </button>
  )
}

function BusinessDetailDialog({
  business,
  metrics,
  onClose,
  onVisit,
  onPanel,
}: {
  business: AdminBusiness | null
  metrics?: BusinessMetrics
  onClose: () => void
  onVisit: (slug: string) => void
  onPanel: (slug: string) => void
}) {
  const licActive =
    business?.license && business.license.active && new Date(business.license.endDate) > new Date()

  return (
    <Dialog open={Boolean(business)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {business && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {business.name}
                {business.license && (
                  <Badge variant={licActive ? 'default' : 'destructive'}>
                    {licActive ? 'ACTIVO' : 'EXPIRADO'}
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>/{business.slug}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Información general */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow label="Categoría" value={business.category.name} />
                <InfoRow label="Dueño" value={`${business.owner.name} (@${business.owner.username})`} />
                <InfoRow label="Creado" value={new Date(business.createdAt).toLocaleDateString('es-ES')} />
                <InfoRow
                  label="Servicios"
                  value={String(business._count?.services ?? 0)}
                />
                {business.address && <InfoRow label="Dirección" value={business.address} span2 />}
                {business.phone && <InfoRow label="Teléfono" value={business.phone} />}
                {business.email && <InfoRow label="Email" value={business.email} />}
                {business.description && <InfoRow label="Descripción" value={business.description} span2 />}
              </div>

              {/* Licencia */}
              {business.license && (
                <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                  <p className="mb-2 font-medium">Licencia</p>
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                    <InfoRow
                      label="Inicio"
                      value={new Date(business.license.startDate).toLocaleDateString('es-ES')}
                    />
                    <InfoRow
                      label="Fin"
                      value={new Date(business.license.endDate).toLocaleDateString('es-ES')}
                    />
                    <InfoRow label="Duración" value={`${business.license.durationDays} días`} />
                    <InfoRow label="Estado" value={business.license.active ? 'Activa' : 'Inactiva'} />
                  </div>
                </div>
              )}

              {/* Métricas */}
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-sm font-medium">Métricas</p>
                {metrics ? (
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <MetricBox label="Visitas" value={metrics.visits} icon={Eye} />
                    <MetricBox label="Citas" value={metrics.appointments} icon={CalIcon} />
                    <MetricBox label="Completadas" value={metrics.completed} icon={CheckCircle2} tone="text-green-600" />
                    <MetricBox label="Pendientes" value={metrics.pending} icon={Clock} tone="text-amber-600" />
                    <MetricBox label="Confirmadas" value={metrics.confirmed} icon={CalendarCheck} tone="text-blue-600" />
                    <MetricBox label="Canceladas" value={metrics.cancelled} icon={XCircle} tone="text-red-600" />
                    <div className="col-span-3 rounded-md bg-primary/10 py-2">
                      <div className="flex items-center justify-center gap-1 text-sm font-semibold text-primary">
                        <Wallet className="h-4 w-4" />
                        ${metrics.revenue.toLocaleString('es-ES')} en citas completadas
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    Sin métricas registradas todavía.
                  </p>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cerrar</Button>
              <Button variant="outline" onClick={() => onVisit(business.slug)}>
                Ver sitio público
              </Button>
              <Button onClick={() => onPanel(business.slug)}>Panel del dueño</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function InfoRow({ label, value, span2 }: { label: string; value: string; span2?: boolean }) {
  return (
    <div className={span2 ? 'col-span-2' : ''}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value || '—'}</div>
    </div>
  )
}

function MetricBox({
  label,
  value,
  icon: Icon,
  tone = 'text-foreground',
}: {
  label: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  tone?: string
}) {
  return (
    <div className="rounded-md border bg-card p-2">
      <Icon className={`mx-auto h-3.5 w-3.5 ${tone}`} />
      <div className={`text-lg font-bold ${tone}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  )
}
