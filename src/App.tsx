import React, { useState } from 'react';
import { Rocket, Globe, Star, TrendingUp, Info, Upload, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { clsx } from 'clsx';

interface PredictionResult {
  predicted_class: string;
  probabilities: {
    'Confirmed': number;
    'Candidate': number;
    'False Positive': number;
  };
  top_features: Array<{
    feature: string;
    importance: number;
    value: number;
  }>;
}

const FEATURE_LABELS = {
  koi_period: 'Orbital Period (days)',
  koi_prad: 'Planet Radius (Earth radii)',
  koi_sma: 'Semi-major Axis (AU)',
  koi_incl: 'Inclination (degrees)',
  koi_teq: 'Equilibrium Temperature (K)',
  koi_slogg: 'Stellar Surface Gravity (log g)',
  koi_srad: 'Stellar Radius (solar radii)',
  koi_smass: 'Stellar Mass (solar masses)',
  koi_steff: 'Stellar Effective Temperature (K)'
};

const FEATURE_DEFAULTS = {
  koi_period: 10.0,
  koi_prad: 2.0,
  koi_sma: 0.1,
  koi_incl: 85.0,
  koi_teq: 300.0,
  koi_slogg: 4.5,
  koi_srad: 1.0,
  koi_smass: 1.0,
  koi_steff: 5500.0
};

function App() {
  const [features, setFeatures] = useState(FEATURE_DEFAULTS);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'manual' | 'upload'>('manual');
  const [uploadedData, setUploadedData] = useState<any>(null);

  const handleFeatureChange = (feature: string, value: string) => {
    setFeatures(prev => ({
      ...prev,
      [feature]: parseFloat(value) || 0
    }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let data;

        if (file.name.endsWith('.json')) {
          data = JSON.parse(content);
        } else if (file.name.endsWith('.csv')) {
          // Simple CSV parsing for the first row of data
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          const values = lines[1]?.split(',').map(v => parseFloat(v.trim()));
          
          if (values && values.length >= 9) {
            data = {};
            Object.keys(FEATURE_DEFAULTS).forEach((key, index) => {
              data[key] = values[index] || FEATURE_DEFAULTS[key as keyof typeof FEATURE_DEFAULTS];
            });
          }
        }

        if (data) {
          // Validate and set features from uploaded data
          const newFeatures = { ...FEATURE_DEFAULTS };
          Object.keys(FEATURE_DEFAULTS).forEach(key => {
            if (data[key] !== undefined && !isNaN(parseFloat(data[key]))) {
              newFeatures[key as keyof typeof FEATURE_DEFAULTS] = parseFloat(data[key]);
            }
          });
          setFeatures(newFeatures);
          setUploadedData(data);
          setError(null);
        }
      } catch (err) {
        setError('Failed to parse file. Please check the format.');
      }
    };
    reader.readAsText(file);
  };
  const handlePredict = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const featureArray = Object.values(features);
      const response = await fetch('http://localhost:3001/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ features: featureArray }),
      });

      if (!response.ok) {
        throw new Error('Prediction failed');
      }

      const result = await response.json();
      setPrediction(result);
    } catch (err) {
      setError('Failed to connect to prediction service. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const getClassColor = (className: string) => {
    switch (className) {
      case 'Confirmed': return 'text-green-400';
      case 'Candidate': return 'text-yellow-400';
      case 'False Positive': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getClassBgColor = (className: string) => {
    switch (className) {
      case 'Confirmed': return 'bg-green-500/10 border-green-500/20';
      case 'Candidate': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'False Positive': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  const chartData = prediction ? [
    { name: 'Confirmed', value: prediction.probabilities.Confirmed * 100, fill: '#10b981' },
    { name: 'Candidate', value: prediction.probabilities.Candidate * 100, fill: '#f59e0b' },
    { name: 'False Positive', value: prediction.probabilities['False Positive'] * 100, fill: '#ef4444' },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-blue-500/20 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <Rocket className="h-8 w-8 text-blue-400" />
              <h1 className="text-2xl font-bold text-white">NASA Exoplanet Classifier</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Form */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-blue-500/20">
              <div className="flex flex-col items-center space-y-4 mb-6">
                <div className="flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                  <h2 className="text-xl font-semibold text-white">Exoplanet Parameters</h2>
                </div>
                
                {/* Tab Switcher */}
                <div className="flex bg-slate-700/50 rounded-lg p-1">
                  <button
                    onClick={() => setActiveTab('manual')}
                    className={clsx(
                      'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                      activeTab === 'manual'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    Manual
                  </button>
                  <button
                    onClick={() => setActiveTab('upload')}
                    className={clsx(
                      'px-3 py-1 rounded-md text-sm font-medium transition-colors',
                      activeTab === 'upload'
                        ? 'bg-blue-500 text-white'
                        : 'text-gray-400 hover:text-white'
                    )}
                  >
                    Upload
                  </button>
                </div>
              </div>
              
              {activeTab === 'manual' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(FEATURE_LABELS).map(([key, label]) => (
                    <div key={key} className="space-y-2">
                      <label className="text-sm text-gray-300 block">
                        {label}
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={features[key as keyof typeof features]}
                        onChange={(e) => handleFeatureChange(key, e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600/50 rounded-lg text-white placeholder-gray-400 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* File Upload Area */}
                  <div className="border-2 border-dashed border-slate-600/50 rounded-lg p-8 text-center hover:border-blue-400/50 transition-colors">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">Upload Data File</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Upload a CSV or JSON file with exoplanet parameters
                    </p>
                    <input
                      type="file"
                      accept=".csv,.json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                    />
                    <label
                      htmlFor="file-upload"
                      className="inline-flex items-center px-4 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-400 hover:bg-blue-500/30 cursor-pointer transition-colors"
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Choose File
                    </label>
                  </div>

                  {/* File Format Info */}
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white mb-2">Expected File Format:</h4>
                    <div className="text-xs text-gray-400 space-y-1">
                      <p><strong>CSV:</strong> First row should contain values in this order:</p>
                      <p className="font-mono text-xs bg-slate-800/50 p-2 rounded">
                        koi_period, koi_prad, koi_sma, koi_incl, koi_teq, koi_slogg, koi_srad, koi_smass, koi_steff
                      </p>
                      <p><strong>JSON:</strong> Object with feature names as keys</p>
                    </div>
                  </div>

                  {/* Show uploaded data preview */}
                  {uploadedData && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-green-400 mb-2">✓ File uploaded successfully</h4>
                      <p className="text-xs text-gray-400">Data has been loaded into the form. You can switch to Manual tab to review.</p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handlePredict}
                disabled={loading}
                className={clsx(
                  'w-full mt-6 px-6 py-3 rounded-lg font-medium transition-all duration-200',
                  'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700',
                  'text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]',
                  'disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none'
                )}
              >
                {loading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Analyzing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <Star className="h-4 w-4" />
                    <span>Classify Exoplanet</span>
                  </div>
                )}
              </button>
            </div>

            {/* About Section */}
            <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-blue-500/20">
              <div className="flex items-center space-x-2 mb-4">
                <Info className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">About This Classifier</h3>
              </div>
              <p className="text-gray-300 text-sm leading-relaxed">
                This project uses advanced machine learning (XGBoost, CatBoost, LightGBM) to classify 
                Kepler Objects of Interest into Confirmed planets, Candidates, or False Positives. 
                The ensemble model analyzes orbital parameters, stellar properties, and physical 
                characteristics to make accurate predictions about exoplanet candidates.
              </p>
            </div>
          </div>

          {/* Results */}
          <div className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {prediction && (
              <>
                {/* Prediction Result */}
                <div className={clsx(
                  'rounded-xl p-6 border backdrop-blur-md',
                  getClassBgColor(prediction.predicted_class)
                )}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Classification Result</h3>
                    <TrendingUp className="h-5 w-5 text-blue-400" />
                  </div>
                  
                  <div className="text-center">
                    <div className={clsx('text-3xl font-bold mb-2', getClassColor(prediction.predicted_class))}>
                      {prediction.predicted_class}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Confidence: {(Math.max(...Object.values(prediction.probabilities)) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Confidence Chart */}
                <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-blue-500/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Confidence Scores</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis 
                          dataKey="name" 
                          tick={{ fill: '#cbd5e1', fontSize: 12 }}
                          stroke="#64748b"
                        />
                        <YAxis 
                          domain={[0, 100]}
                          tick={{ fill: '#cbd5e1', fontSize: 12 }}
                          stroke="#64748b"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: '1px solid #475569',
                            borderRadius: '8px',
                            color: '#fff'
                          }}
                          formatter={(value: number) => [`${value.toFixed(1)}%`, 'Confidence']}
                        />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Feature Importance */}
                <div className="bg-slate-800/50 backdrop-blur-md rounded-xl p-6 border border-blue-500/20">
                  <h3 className="text-lg font-semibold text-white mb-4">Key Influencing Features</h3>
                  <div className="space-y-3">
                    {prediction.top_features.map((feature, index) => (
                      <div key={feature.feature} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs text-blue-400 font-medium">
                            {index + 1}
                          </div>
                          <span className="text-gray-300 text-sm">
                            {FEATURE_LABELS[feature.feature as keyof typeof FEATURE_LABELS]}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-400 text-xs">
                            {feature.value.toFixed(2)}
                          </span>
                          <div className={clsx(
                            'px-2 py-1 rounded text-xs font-medium',
                            feature.importance > 0 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          )}>
                            {feature.importance > 0 ? '+' : ''}{feature.importance.toFixed(3)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;