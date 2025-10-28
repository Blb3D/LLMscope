
import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle, Mail, MessageSquare, Settings } from 'lucide-react';

const SetupWizard = ({ onComplete, apiKey = 'dev-123' }) => {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    enableEmail: false,
    smtpServer: 'smtp.gmail.com',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    alertEmailFrom: '',
    alertEmailTo: '',
    enableSlack: false,
    slackWebhookUrl: '',
    alertOnRules: ['R1', 'R2', 'R3'],
  });

  const steps = [
    { title: 'Welcome', icon: '🚀' },
    { title: 'Email Alerts', icon: '✉️' },
    { title: 'Slack Alerts', icon: '💬' },
    { title: 'Alert Rules', icon: '⚙️' },
    { title: 'Review', icon: '✓' },
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleRuleToggle = (rule) => {
    setFormData(prev => ({
      ...prev,
      alertOnRules: prev.alertOnRules.includes(rule)
        ? prev.alertOnRules.filter(r => r !== rule)
        : [...prev.alertOnRules, rule]
    }));
  };

  const validateEmail = () => {
    if (formData.enableEmail) {
      if (!formData.smtpUser) return 'SMTP username required';
      if (!formData.smtpPassword) return 'SMTP password required';
      if (!formData.alertEmailFrom) return 'From email required';
      if (!formData.alertEmailTo) return 'Alert recipient email required';
    }
    return '';
  };

  const validateSlack = () => {
    if (formData.enableSlack) {
      if (!formData.slackWebhookUrl) return 'Slack webhook URL required';
      if (!formData.slackWebhookUrl.includes('hooks.slack.com')) {
        return 'Invalid Slack webhook URL';
      }
    }
    return '';
  };

  const handleNext = async () => {
    if (step === 1) {
      const err = validateEmail();
      if (err) {
        setError(err);
        return;
      }
    }
    if (step === 2) {
      const err = validateSlack();
      if (err) {
        setError(err);
        return;
      }
    }

    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
    setError('');
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      const settingsToSave = [
        { key: 'enable_email_alerts', value: formData.enableEmail ? 'true' : 'false' },
        { key: 'enable_slack_alerts', value: formData.enableSlack ? 'true' : 'false' },
        { key: 'alert_on_rule', value: formData.alertOnRules.join(',') },
        { key: 'smtp_server', value: formData.smtpServer },
        { key: 'smtp_port', value: formData.smtpPort.toString() },
        { key: 'smtp_user', value: formData.smtpUser },
        { key: 'smtp_password', value: formData.smtpPassword },
        { key: 'alert_email_from', value: formData.alertEmailFrom },
        { key: 'alert_email_to', value: formData.alertEmailTo },
        { key: 'slack_webhook_url', value: formData.slackWebhookUrl },
      ];

      for (const setting of settingsToSave) {
        const response = await fetch(`/api/settings/${setting.key}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ value: setting.value }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save ${setting.key}`);
        }
      }

      localStorage.setItem('llmscope_setup_complete', 'true');
      onComplete();
    } catch (err) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('llmscope_setup_complete', 'true');
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center z-50">
      <div className="w-full max-w-2xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {steps.map((s, i) => (
              <div key={i} className="flex items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i <= step ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                  {i <= step ? (i === step ? i + 1 : '✓') : i + 1}
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-1 mx-2 rounded transition-all ${i < step ? 'bg-cyan-500' : 'bg-slate-700'}`} />}
              </div>
            ))}
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              {steps[step].title}
            </h2>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm">
          {step === 0 && (
            <div className="space-y-6">
              <div className="text-center space-y-4">
                <div className="text-6xl mb-4">🚀</div>
                <p className="text-xl font-bold text-cyan-300">Welcome to LLMscope!</p>
                <p className="text-slate-400 max-w-md mx-auto">Let's set up real-time alerts so you never miss a performance issue. This setup will take 2 minutes.</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 space-y-3">
                <h3 className="font-bold text-cyan-300">What we'll configure:</h3>
                <ul className="space-y-2 text-sm text-slate-400">
                  <li className="flex gap-2"><span>✉️</span><span>Email alerts for critical violations</span></li>
                  <li className="flex gap-2"><span>💬</span><span>Slack notifications for your team</span></li>
                  <li className="flex gap-2"><span>⚙️</span><span>Which violation rules to monitor</span></li>
                </ul>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <input type="checkbox" checked={formData.enableEmail} onChange={(e) => handleInputChange('enableEmail', e.target.checked)} className="w-5 h-5 rounded cursor-pointer" />
                <label className="font-bold text-cyan-300 cursor-pointer">Enable Email Alerts</label>
              </div>
              {formData.enableEmail && (
                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-sm text-slate-300">
                    <p className="font-bold mb-2">Using Gmail?</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Enable 2FA on your Google account</li>
                      <li>Visit <span className="text-cyan-400">myaccount.google.com/apppasswords</span></li>
                      <li>Generate an app password (16 chars)</li>
                      <li>Use that password below, not your regular password</li>
                    </ol>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">SMTP Server</label>
                    <input type="text" value={formData.smtpServer} onChange={(e) => handleInputChange('smtpServer', e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="smtp.gmail.com" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-slate-400">SMTP Port</label>
                      <input type="number" value={formData.smtpPort} onChange={(e) => handleInputChange('smtpPort', parseInt(e.target.value))} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" />
                    </div>
                    <div>
                      <label className="text-sm text-slate-400">SMTP Username</label>
                      <input type="email" value={formData.smtpUser} onChange={(e) => handleInputChange('smtpUser', e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="your-email@gmail.com" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">SMTP Password (App Password)</label>
                    <input type="password" value={formData.smtpPassword} onChange={(e) => handleInputChange('smtpPassword', e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="16-character app password" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">From Address</label>
                    <input type="email" value={formData.alertEmailFrom} onChange={(e) => handleInputChange('alertEmailFrom', e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="alerts@llmscope.com" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Alert Recipients (comma-separated)</label>
                    <input type="text" value={formData.alertEmailTo} onChange={(e) => handleInputChange('alertEmailTo', e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white" placeholder="team@company.com, ops@company.com" />
                  </div>
                </div>
              )}
              {!formData.enableEmail && <p className="text-slate-400 text-sm">Email alerts are optional. You can enable them anytime.</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <input type="checkbox" checked={formData.enableSlack} onChange={(e) => handleInputChange('enableSlack', e.target.checked)} className="w-5 h-5 rounded cursor-pointer" />
                <label className="font-bold text-cyan-300 cursor-pointer">Enable Slack Alerts</label>
              </div>
              {formData.enableSlack && (
                <div className="space-y-4">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-sm text-slate-300">
                    <p className="font-bold mb-2">Setting up Slack Webhook:</p>
                    <ol className="list-decimal list-inside space-y-1 text-xs">
                      <li>Go to your Slack workspace settings</li>
                      <li>Navigate to Apps & Integrations</li>
                      <li>Create new app with Incoming Webhooks enabled</li>
                      <li>Add webhook to your #alerts channel</li>
                      <li>Copy the webhook URL below</li>
                    </ol>
                  </div>
                  <div>
                    <label className="text-sm text-slate-400">Slack Webhook URL</label>
                    <input type="password" value={formData.slackWebhookUrl} onChange={(e) => handleInputChange('slackWebhookUrl', e.target.value)} className="w-full mt-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white font-mono" placeholder="https://hooks.slack.com/services/YOUR/WEBHOOK/URL" />
                  </div>
                </div>
              )}
              {!formData.enableSlack && <p className="text-slate-400 text-sm">Slack alerts are optional. You can enable them anytime.</p>}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <p className="text-slate-400 text-sm">Select which Nelson Rules violations should trigger alerts. All are enabled by default.</p>
              <div className="space-y-3">
                {['R1', 'R2', 'R3'].map(rule => (
                  <div key={rule} onClick={() => handleRuleToggle(rule)} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 cursor-pointer hover:border-cyan-500/50 transition">
                    <div className="flex items-center gap-3">
                      <input type="checkbox" checked={formData.alertOnRules.includes(rule)} onChange={() => {}} className="w-5 h-5 rounded cursor-pointer" />
                      <div>
                        <p className="font-bold text-cyan-300">{rule}</p>
                        <p className="text-sm text-slate-400">
                          {rule === 'R1' && 'Point beyond 3σ from mean (sudden spike/drop)'}
                          {rule === 'R2' && '9+ consecutive points on same side (sustained shift)'}
                          {rule === 'R3' && '6+ points in increasing/decreasing trend'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <h3 className="font-bold text-cyan-300 mb-2">✉️ Email Alerts</h3>
                  <p className="text-sm text-slate-400">
                    {formData.enableEmail ? `Enabled → ${formData.alertEmailTo}` : 'Disabled (can enable later)'}
                  </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <h3 className="font-bold text-cyan-300 mb-2">💬 Slack Alerts</h3>
                  <p className="text-sm text-slate-400">
                    {formData.enableSlack ? 'Enabled → Webhook configured' : 'Disabled (can enable later)'}
                  </p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <h3 className="font-bold text-cyan-300 mb-2">🎯 Alert Rules</h3>
                  <p className="text-sm text-slate-400">Monitoring: {formData.alertOnRules.join(', ')}</p>
                </div>
              </div>
              <div className="bg-emerald-950/30 border border-emerald-700/50 rounded-lg p-4 text-sm">
                <p className="text-emerald-300 font-bold">✓ Ready to go!</p>
                <p className="text-emerald-200 text-xs mt-1">LLMscope will now monitor your LLM performance and send alerts when issues are detected.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-3 text-sm text-red-200 mb-6">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-8 justify-between">
          <div className="flex gap-3">
            {step > 0 && <button onClick={handlePrev} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-bold transition">← Back</button>}
            {step === 0 && <button onClick={handleSkip} className="px-6 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg font-bold transition text-slate-400">Skip Setup</button>}
          </div>
          <div className="flex gap-3">
            {step < steps.length - 1 ? (
              <button onClick={handleNext} className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 rounded-lg font-bold flex items-center gap-2 transition">
                Next <ChevronRight size={18} />
              </button>
            ) : (
              <button onClick={handleSave} disabled={loading} className="px-8 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 rounded-lg font-bold flex items-center gap-2 transition disabled:opacity-50">
                {loading ? 'Saving...' : '✓ Finish Setup'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;