import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { updateProfile, changePassword, getBranch, updateBranch } from '../../api'
import { useAuthStore, useThemeStore } from '../../store'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'shop',       icon: '🏪', label: 'My Coffee Shop' },
  { id: 'profile',    icon: '👤', label: 'My Profile' },
  { id: 'security',   icon: '🔒', label: 'Security' },
  { id: 'appearance', icon: '🎨', label: 'Appearance' },
]

const CURRENCIES = ['DZD', 'EUR', 'USD', 'GBP', 'MAD', 'TND']

export default function Settings() {
  const qc = useQueryClient()
  const { user, setAuth, token } = useAuthStore()
  const { dark, toggle } = useThemeStore()
  const fileRef = useRef()

  const [activeTab, setActiveTab] = useState('shop')
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '' })
  const [pwForm, setPwForm] = useState({ current: '', newPass: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, newPass: false, confirm: false })

  const branchId = user?.branch?._id || user?.branch
  const canEditShop = user?.role === 'admin' || user?.role === 'manager'

  // Load branch
  const { data: branchData, isLoading: loadingBranch } = useQuery({
    queryKey: ['branch', branchId],
    queryFn: () => getBranch(branchId),
    enabled: !!branchId,
  })
  const branch = branchData?.data || branchData || null

  const [shopForm, setShopForm] = useState(null)

  // Sync shopForm when branch loads
  if (branch && !shopForm) {
    setShopForm({
      name:          branch.name || '',
      address:       branch.address || '',
      phone:         branch.phone || '',
      email:         branch.email || '',
      website:       branch.website || '',
      description:   branch.description || '',
      logo:          branch.logo || '',
      openTime:      branch.openTime || '07:00',
      closeTime:     branch.closeTime || '22:00',
      currency:      branch.currency || 'DZD',
      taxRate:       branch.taxRate ?? 0,
      wifiPassword:  branch.wifiPassword || '',
      receiptFooter: branch.receiptFooter || 'Thank you for your visit! ☕',
      instagram:     branch.socialMedia?.instagram || '',
      facebook:      branch.socialMedia?.facebook || '',
      tiktok:        branch.socialMedia?.tiktok || '',
    })
  }

  // Mutations
  const { mutate: saveShop, isPending: savingShop } = useMutation({
    mutationFn: (data) => updateBranch(branchId, {
      name: data.name, address: data.address, phone: data.phone,
      email: data.email, website: data.website, description: data.description,
      logo: data.logo, openTime: data.openTime, closeTime: data.closeTime,
      currency: data.currency, taxRate: Number(data.taxRate),
      wifiPassword: data.wifiPassword, receiptFooter: data.receiptFooter,
      socialMedia: { instagram: data.instagram, facebook: data.facebook, tiktok: data.tiktok },
    }),
    onSuccess: () => { toast.success('Shop info saved! ☕'); qc.invalidateQueries({ queryKey: ['branch', branchId] }) },
  })

  const { mutate: saveProfile, isPending: savingProfile } = useMutation({
    mutationFn: updateProfile,
    onSuccess: (res) => { setAuth(res.data?.data || res.data, token); toast.success('Profile updated!') },
  })

  const { mutate: changePw, isPending: savingPw } = useMutation({
    mutationFn: changePassword,
    onSuccess: () => { toast.success('Password changed!'); setPwForm({ current: '', newPass: '', confirm: '' }) },
  })

  // Logo upload → base64
  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) return toast.error('Logo must be under 2 MB')
    const reader = new FileReader()
    reader.onload = (ev) => setShopForm(f => ({ ...f, logo: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const sf = (k) => (e) => setShopForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-coffee-900 dark:text-coffee-50">Settings</h1>
        <p className="text-coffee-500 text-sm mt-1">Configure your coffee shop, profile, and preferences</p>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-coffee-900 border border-coffee-100 dark:border-coffee-800 rounded-2xl p-1.5 flex gap-1 flex-wrap">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 min-w-[120px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-coffee-600 dark:text-coffee-400 hover:bg-coffee-100 dark:hover:bg-coffee-800'}`}>
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>

        {/* ══ MY COFFEE SHOP TAB ══════════════════════════════════════ */}
        {activeTab === 'shop' && (
          <div className="space-y-5">
            {!branchId ? (
              <div className="card text-center py-16">
                <p className="text-4xl mb-3">🏪</p>
                <p className="font-semibold text-coffee-900 dark:text-coffee-100">No branch assigned</p>
                <p className="text-coffee-500 text-sm mt-1">Ask your admin to assign you to a branch.</p>
              </div>
            ) : loadingBranch || !shopForm ? (
              <div className="card flex items-center justify-center py-16">
                <div className="w-8 h-8 border-4 border-coffee-200 border-t-amber-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Logo & Cover */}
                <div className="card space-y-5">
                  <h3 className="font-bold text-coffee-900 dark:text-coffee-50 flex items-center gap-2">
                    <span>🖼️</span> Branding
                  </h3>

                  {/* Logo upload */}
                  <div className="flex items-center gap-5">
                    <div
                      onClick={() => canEditShop && fileRef.current?.click()}
                      className={`w-24 h-24 rounded-2xl border-2 border-dashed border-coffee-300 dark:border-coffee-700 flex items-center justify-center overflow-hidden bg-coffee-50 dark:bg-coffee-800 ${canEditShop ? 'cursor-pointer hover:border-amber-400 transition-colors' : ''}`}>
                      {shopForm.logo
                        ? <img src={shopForm.logo} alt="logo" className="w-full h-full object-contain" />
                        : <span className="text-4xl">☕</span>}
                    </div>
                    <div>
                      <p className="font-semibold text-coffee-900 dark:text-coffee-100 text-sm">Coffee Shop Logo</p>
                      <p className="text-xs text-coffee-500 mt-0.5">PNG or JPG, max 2 MB. Shown on receipts and the sidebar.</p>
                      {canEditShop && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => fileRef.current?.click()} className="btn-primary text-xs px-4 py-2">
                            📷 Upload Logo
                          </button>
                          {shopForm.logo && (
                            <button onClick={() => setShopForm(f => ({ ...f, logo: '' }))} className="btn-secondary text-xs px-4 py-2">
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                    </div>
                  </div>
                </div>

                {/* Basic Info */}
                <div className="card space-y-4">
                  <h3 className="font-bold text-coffee-900 dark:text-coffee-50 flex items-center gap-2">
                    <span>📋</span> Basic Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Coffee Shop Name *</label>
                      <input className="input" value={shopForm.name} onChange={sf('name')} placeholder="e.g. CoffeeMaster" disabled={!canEditShop} />
                    </div>
                    <div>
                      <label className="label">Phone Number</label>
                      <input className="input" value={shopForm.phone} onChange={sf('phone')} placeholder="021-000-000" disabled={!canEditShop} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Address</label>
                      <input className="input" value={shopForm.address} onChange={sf('address')} placeholder="12 Rue Didouche Mourad, Algiers" disabled={!canEditShop} />
                    </div>
                    <div>
                      <label className="label">Email Address</label>
                      <input className="input" type="email" value={shopForm.email} onChange={sf('email')} placeholder="info@mycoffeeshop.dz" disabled={!canEditShop} />
                    </div>
                    <div>
                      <label className="label">Website</label>
                      <input className="input" value={shopForm.website} onChange={sf('website')} placeholder="https://mycoffeeshop.dz" disabled={!canEditShop} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="label">Short Description</label>
                      <textarea className="input resize-none" rows={3} value={shopForm.description} onChange={sf('description')} placeholder="A warm and cozy coffee shop serving the best specialty coffees..." disabled={!canEditShop} />
                    </div>
                  </div>
                </div>

                {/* Hours & Business */}
                <div className="card space-y-4">
                  <h3 className="font-bold text-coffee-900 dark:text-coffee-50 flex items-center gap-2">
                    <span>⚙️</span> Business Settings
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="label">Opens At</label>
                      <input type="time" className="input" value={shopForm.openTime} onChange={sf('openTime')} disabled={!canEditShop} />
                    </div>
                    <div>
                      <label className="label">Closes At</label>
                      <input type="time" className="input" value={shopForm.closeTime} onChange={sf('closeTime')} disabled={!canEditShop} />
                    </div>
                    <div>
                      <label className="label">Currency</label>
                      <select className="input" value={shopForm.currency} onChange={sf('currency')} disabled={!canEditShop}>
                        {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Tax Rate (%)</label>
                      <input type="number" min="0" max="100" step="0.5" className="input" value={shopForm.taxRate} onChange={sf('taxRate')} placeholder="0" disabled={!canEditShop} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="label">WiFi Password (for receipts)</label>
                      <input className="input" value={shopForm.wifiPassword} onChange={sf('wifiPassword')} placeholder="MyShopWifi123" disabled={!canEditShop} />
                    </div>
                    <div>
                      <label className="label">Receipt Footer Message</label>
                      <input className="input" value={shopForm.receiptFooter} onChange={sf('receiptFooter')} placeholder="Thank you for your visit!" disabled={!canEditShop} />
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="card space-y-4">
                  <h3 className="font-bold text-coffee-900 dark:text-coffee-50 flex items-center gap-2">
                    <span>📱</span> Social Media
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="label">📸 Instagram</label>
                      <input className="input" value={shopForm.instagram} onChange={sf('instagram')} placeholder="@mycoffeeshop" disabled={!canEditShop} />
                    </div>
                    <div>
                      <label className="label">📘 Facebook</label>
                      <input className="input" value={shopForm.facebook} onChange={sf('facebook')} placeholder="facebook.com/mycoffeeshop" disabled={!canEditShop} />
                    </div>
                    <div>
                      <label className="label">🎵 TikTok</label>
                      <input className="input" value={shopForm.tiktok} onChange={sf('tiktok')} placeholder="@mycoffeeshop" disabled={!canEditShop} />
                    </div>
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="card space-y-3">
                  <h3 className="font-bold text-coffee-900 dark:text-coffee-50 flex items-center gap-2">
                    <span>👁️</span> Live Preview
                  </h3>
                  <div className="rounded-2xl overflow-hidden border-2 border-coffee-100 dark:border-coffee-800">
                    {/* Cover gradient */}
                    <div className="h-20 bg-gradient-to-r from-amber-900 via-coffee-800 to-amber-800" />
                    <div className="p-5 flex items-start gap-4 bg-coffee-50 dark:bg-coffee-900">
                      <div className="w-16 h-16 rounded-xl border-4 border-white dark:border-coffee-800 bg-white flex items-center justify-center shadow-md -mt-10 overflow-hidden">
                        {shopForm.logo
                          ? <img src={shopForm.logo} alt="logo" className="w-full h-full object-contain" />
                          : <span className="text-3xl">☕</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-coffee-900 dark:text-coffee-50 text-base truncate">{shopForm.name || 'Your Coffee Shop'}</p>
                        <p className="text-coffee-500 text-xs mt-0.5 truncate">{shopForm.address || 'Address not set'}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-coffee-500">
                          {shopForm.phone && <span>📞 {shopForm.phone}</span>}
                          {shopForm.openTime && <span>🕐 {shopForm.openTime} – {shopForm.closeTime}</span>}
                          {shopForm.taxRate > 0 && <span>🧾 Tax: {shopForm.taxRate}%</span>}
                          {shopForm.wifiPassword && <span>📶 WiFi: {shopForm.wifiPassword}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {canEditShop && (
                  <div className="flex justify-end">
                    <button
                      onClick={() => saveShop(shopForm)}
                      disabled={savingShop || !shopForm.name}
                      className="btn-primary px-8 py-3 text-sm"
                    >
                      {savingShop ? '⏳ Saving…' : '💾 Save Shop Settings'}
                    </button>
                  </div>
                )}
                {!canEditShop && (
                  <p className="text-center text-xs text-coffee-400">Only Admins and Managers can edit shop settings.</p>
                )}
              </>
            )}
          </div>
        )}

        {/* ══ PROFILE TAB ══════════════════════════════════════════════ */}
        {activeTab === 'profile' && (
          <div className="card space-y-5">
            {/* Avatar Header */}
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-100 dark:border-amber-900">
              <div className="w-16 h-16 rounded-2xl bg-amber-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                {user?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="font-bold text-coffee-900 dark:text-coffee-50">{user?.name}</p>
                <p className="text-coffee-500 text-sm">{user?.email}</p>
                <span className="inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500 text-white capitalize">
                  {user?.role}
                </span>
              </div>
            </div>

            <h3 className="font-bold text-coffee-900 dark:text-coffee-50 flex items-center gap-2">
              👤 Profile Information
            </h3>

            <form onSubmit={(e) => { e.preventDefault(); if (!profileForm.name.trim()) return toast.error('Name required'); saveProfile(profileForm) }}
              className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Full Name</label>
                  <input className="input" value={profileForm.name} onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))} placeholder="Your full name" />
                </div>
                <div>
                  <label className="label">Email Address</label>
                  <input className="input" type="email" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
                </div>
                <div>
                  <label className="label">Role</label>
                  <input className="input opacity-60 cursor-not-allowed" value={user?.role || ''} readOnly />
                </div>
                <div>
                  <label className="label">Branch</label>
                  <input className="input opacity-60 cursor-not-allowed" value={user?.branch?.name || 'All Branches'} readOnly />
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={savingProfile} className="btn-primary px-6 py-2.5">
                  {savingProfile ? '⏳ Saving…' : '✅ Save Profile'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ══ SECURITY TAB ════════════════════════════════════════════ */}
        {activeTab === 'security' && (
          <div className="card space-y-5">
            <h3 className="font-bold text-coffee-900 dark:text-coffee-50 flex items-center gap-2">🔒 Change Password</h3>
            <form onSubmit={(e) => {
              e.preventDefault()
              if (!pwForm.current) return toast.error('Enter current password')
              if (pwForm.newPass.length < 6) return toast.error('Min. 6 characters')
              if (pwForm.newPass !== pwForm.confirm) return toast.error('Passwords do not match')
              changePw({ currentPassword: pwForm.current, newPassword: pwForm.newPass })
            }} className="space-y-4 max-w-md">
              {[
                { key: 'current', label: 'Current Password' },
                { key: 'newPass', label: 'New Password' },
                { key: 'confirm', label: 'Confirm New Password' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="label">{label}</label>
                  <div className="relative">
                    <input
                      className="input pr-10"
                      type={showPw[key] ? 'text' : 'password'}
                      value={pwForm[key]}
                      onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder="••••••••"
                    />
                    <button type="button" onClick={() => setShowPw(s => ({ ...s, [key]: !s[key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-600">
                      {showPw[key] ? '🙈' : '👁️'}
                    </button>
                  </div>
                </div>
              ))}

              {pwForm.newPass && (
                <div>
                  <p className="text-xs text-coffee-500 mb-1">Password strength</p>
                  <div className="h-1.5 bg-coffee-100 dark:bg-coffee-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      pwForm.newPass.length < 6 ? 'w-1/4 bg-red-500' :
                      pwForm.newPass.length < 10 ? 'w-2/4 bg-amber-500' :
                      pwForm.newPass.length < 14 ? 'w-3/4 bg-blue-500' : 'w-full bg-emerald-500'
                    }`} />
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button type="submit" disabled={savingPw} className="btn-primary px-6 py-2.5">
                  {savingPw ? '⏳ Saving…' : '🔒 Update Password'}
                </button>
              </div>
            </form>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-400 mb-2">🔒 Security Tips</p>
              <ul className="text-xs text-amber-700 dark:text-amber-500 space-y-1">
                <li>• Use at least 8 characters with letters, numbers, and symbols</li>
                <li>• Do not reuse passwords from other services</li>
                <li>• Change your password every 3 months</li>
              </ul>
            </div>
          </div>
        )}

        {/* ══ APPEARANCE TAB ══════════════════════════════════════════ */}
        {activeTab === 'appearance' && (
          <div className="card space-y-6">
            <h3 className="font-bold text-coffee-900 dark:text-coffee-50 flex items-center gap-2">🎨 Appearance</h3>

            {/* Dark Mode Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-coffee-50 dark:bg-coffee-800 border border-coffee-100 dark:border-coffee-700">
              <div>
                <p className="font-semibold text-coffee-900 dark:text-coffee-100 text-sm">{dark ? '🌙 Dark Mode' : '☀️ Light Mode'}</p>
                <p className="text-xs text-coffee-500 mt-0.5">Toggle between light and dark theme</p>
              </div>
              <button onClick={toggle}
                className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${dark ? 'bg-violet-500' : 'bg-coffee-300'}`}>
                <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${dark ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-coffee-50 dark:bg-coffee-800 border border-coffee-100 dark:border-coffee-700">
              <p className="text-sm font-semibold text-coffee-900 dark:text-coffee-100 mb-1">ℹ️ App Version</p>
              <p className="text-xs text-coffee-500">CoffeeMaster v1.1.0 — Professional Coffee Shop Management System</p>
            </div>
          </div>
        )}

      </motion.div>
    </div>
  )
}
