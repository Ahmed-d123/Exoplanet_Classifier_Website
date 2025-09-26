import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Mock model predictions - simulates ensemble ML pipeline
function mockPredict(features) {
  const [koi_period, koi_prad, koi_sma, koi_incl, koi_teq, koi_slogg, koi_srad, koi_smass, koi_steff] = features;
  
  // Simulate realistic prediction logic based on exoplanet characteristics
  let confirmedProb = 0.33;
  let candidateProb = 0.33;
  let falsePositiveProb = 0.34;
  
  // Simple heuristics to make predictions more realistic
  // Smaller planets with moderate temperatures are more likely to be confirmed
  if (koi_prad > 0.5 && koi_prad < 4 && koi_teq > 200 && koi_teq < 400) {
    confirmedProb += 0.2;
  }
  
  // Very large planets might be false positives
  if (koi_prad > 10) {
    falsePositiveProb += 0.3;
  }
  
  // Very short periods might indicate false positives
  if (koi_period < 1) {
    falsePositiveProb += 0.2;
  }
  
  // Normalize probabilities
  const total = confirmedProb + candidateProb + falsePositiveProb;
  confirmedProb /= total;
  candidateProb /= total;
  falsePositiveProb /= total;
  
  const probabilities = [confirmedProb, candidateProb, falsePositiveProb];
  const labels = ['Confirmed', 'Candidate', 'False Positive'];
  const maxIndex = probabilities.indexOf(Math.max(...probabilities));
  const predictedLabel = labels[maxIndex];
  
  // Mock SHAP values - simulate feature importance
  const featureNames = [
    'koi_period', 'koi_prad', 'koi_sma', 'koi_incl',
    'koi_teq', 'koi_slogg', 'koi_srad', 'koi_smass', 'koi_steff'
  ];
  
  const shapValues = features.map((value, index) => ({
    feature: featureNames[index],
    importance: (Math.random() - 0.5) * 2, // Random importance between -1 and 1
    value: value
  }));
  
  // Sort by absolute importance and take top 3
  const topFeatures = shapValues
    .sort((a, b) => Math.abs(b.importance) - Math.abs(a.importance))
    .slice(0, 3);
  
  return {
    predicted_class: predictedLabel,
    probabilities: {
      'Confirmed': confirmedProb,
      'Candidate': candidateProb,
      'False Positive': falsePositiveProb
    },
    top_features: topFeatures
  };
}

// Prediction endpoint
app.post('/predict', (req, res) => {
  try {
    const { features } = req.body;
    
    if (!features || features.length !== 9) {
      return res.status(400).json({
        error: 'Invalid input: Expected 9 features'
      });
    }
    
    // Validate that all features are numbers
    const numericFeatures = features.map(f => parseFloat(f));
    if (numericFeatures.some(f => isNaN(f))) {
      return res.status(400).json({
        error: 'All features must be numeric values'
      });
    }
    
    const prediction = mockPredict(numericFeatures);
    res.json(prediction);
    
  } catch (error) {
    res.status(500).json({
      error: 'Prediction failed',
      details: error.message
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', message: 'Exoplanet Classifier API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});