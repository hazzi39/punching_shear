import React, { useState, useEffect } from 'react';
import { Info, RefreshCcw, Download, Trash2, Save } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';

interface InputValues {
  u: number;
  dom: number;
  fc: number;
  sigmacp: number;
  betah: number;
  hasShearReinforcement: boolean;
}

interface SavedResult {
  id: string;
  timestamp: string;
  values: InputValues;
  result: number;
}

const tooltips = {
  u: "Critical shear perimeter (u): The length of the line geometrically similar to the boundary of the effective area. Must be positive.",
  dom: "Mean effective depth (dom): Average value around the critical shear perimeter. Typically ranges from 100-1000mm.",
  fc: "Concrete strength (f'c): Characteristic compressive strength of concrete. Usually between 20-100 MPa.",
  sigmacp: "Effective prestress (σcp): Average intensity of effective prestress in concrete. Typically 0-10 MPa.",
  betah: "Ratio (βh): Ratio of longest to shortest dimension of the effective loaded area. Must be greater than 1.",
};

function App() {
  const [values, setValues] = useState<InputValues>({
    u: 0,
    dom: 0,
    fc: 0,
    sigmacp: 0,
    betah: 0,
    hasShearReinforcement: false,
  });

  const [result, setResult] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savedResults, setSavedResults] = useState<SavedResult[]>([]);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const calculateFcv = (fc: number, betah: number): number => {
    return Math.min(0.17 * (1 + 2/betah) * Math.sqrt(fc), 0.34 * Math.sqrt(fc));
  };

  const calculateVuo = (values: InputValues): number => {
    const fcv = calculateFcv(values.fc, values.betah);
    
    if (values.hasShearReinforcement) {
      return Math.min(
        values.u * values.dom * (0.5 * Math.sqrt(values.fc) + 0.3 * values.sigmacp),
        0.2 * values.u * values.dom * values.fc
      );
    } else {
      return values.u * values.dom * (fcv + 0.3 * values.sigmacp);
    }
  };

  const handleInputChange = (field: keyof InputValues, value: string | boolean) => {
    if (typeof value === 'boolean') {
      setValues(prev => ({ ...prev, [field]: value }));
      return;
    }

    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setValues(prev => ({ ...prev, [field]: numValue }));
      setErrors(prev => ({ ...prev, [field]: '' }));
    } else {
      setErrors(prev => ({ ...prev, [field]: 'Please enter a valid number' }));
    }
  };

  const handleCalculate = () => {
    const newErrors: Record<string, string> = {};
    Object.entries(values).forEach(([key, value]) => {
      if (typeof value === 'number' && value <= 0) {
        newErrors[key] = 'Value must be greater than 0';
      }
    });

    if (Object.keys(newErrors).length === 0) {
      const result = calculateVuo(values);
      setResult(result);
    } else {
      setErrors(newErrors);
    }
  };

  const handleReset = () => {
    setValues({
      u: 0,
      dom: 0,
      fc: 0,
      sigmacp: 0,
      betah: 0,
      hasShearReinforcement: false,
    });
    setResult(null);
    setErrors({});
  };

  const handleSaveResult = () => {
    if (result === null) return;

    const newResult: SavedResult = {
      id: crypto.randomUUID(),
      timestamp: new Date().toLocaleString(),
      values: { ...values },
      result,
    };

    setSavedResults(prev => [newResult, ...prev]);
  };

  const handleDeleteResult = (id: string) => {
    setSavedResults(prev => prev.filter(result => result.id !== id));
  };

  const handleDownload = () => {
    if (savedResults.length === 0) return;

    const data = savedResults.map(saved => `
Calculation ID: ${saved.id}
Timestamp: ${saved.timestamp}

Input Parameters:
Critical shear perimeter (u): ${saved.values.u}
Mean effective depth (dom): ${saved.values.dom}
Concrete strength (fc): ${saved.values.fc}
Effective prestress (σcp): ${saved.values.sigmacp}
Ratio βh: ${saved.values.betah}
Shear Reinforcement: ${saved.values.hasShearReinforcement ? 'Yes' : 'No'}

Result:
Ultimate shear strength (Vuo): ${saved.result.toFixed(2)} N
----------------------------------------
`).join('\n');

    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'shear-strength-calculations.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Slab Shear Strength Calculator
          </h1>

          <div className="mb-8 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Equation:</h2>
            <div className="text-center">
              {!values.hasShearReinforcement ? (
                <InlineMath>{"V_{uo} = ud_{om}(f_{cv} + 0.3\\sigma_{cp})"}</InlineMath>
              ) : (
                <InlineMath>{"V_{uo} = ud_{om}(0.5\\sqrt{f'_c} + 0.3\\sigma_{cp}) \\leq 0.2ud_{om}f'_c"}</InlineMath>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {Object.entries(tooltips).map(([key, tooltip]) => (
              <div key={key} className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {key === 'u' ? 'Critical shear perimeter (u)' :
                   key === 'dom' ? 'Mean effective depth (dom)' :
                   key === 'fc' ? "Concrete strength (f'c)" :
                   key === 'sigmacp' ? 'Effective prestress (σcp)' :
                   'Ratio (βh)'}
                  <span 
                    className="inline-block ml-1 text-blue-600 cursor-help"
                    onMouseEnter={() => setShowTooltip(key)}
                    onMouseLeave={() => setShowTooltip(null)}
                  >
                    <Info size={16} />
                  </span>
                </label>
                {showTooltip === key && (
                  <div className="absolute z-10 bg-gray-900 text-white p-2 rounded text-sm max-w-xs">
                    {tooltip}
                  </div>
                )}
                <input
                  type="number"
                  value={values[key as keyof InputValues] || ''}
                  onChange={(e) => handleInputChange(key as keyof InputValues, e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md ${
                    errors[key] ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter value > 0"
                />
                {errors[key] && <p className="text-red-500 text-sm mt-1">{errors[key]}</p>}
              </div>
            ))}

            <div className="relative flex items-center">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values.hasShearReinforcement}
                  onChange={(e) => handleInputChange('hasShearReinforcement', e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Has shear reinforcement</span>
              </label>
            </div>
          </div>

          <div className="flex justify-center space-x-4 mb-8">
            <button
              onClick={handleCalculate}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Calculate
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center"
            >
              <RefreshCcw size={16} className="mr-2" />
              Reset
            </button>
          </div>

          {result !== null && (
            <div className="bg-green-50 p-6 rounded-lg mb-8">
              <h3 className="text-lg font-semibold text-green-800 mb-2">Results</h3>
              <p className="text-green-700 mb-4">
                Ultimate shear strength (V<sub>uo</sub>): {result.toFixed(2)} N
              </p>
              <div className="flex space-x-4">
                <button
                  onClick={handleSaveResult}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  <Save size={16} className="mr-2" />
                  Save Result
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <Download size={16} className="mr-2" />
                  Download All Results
                </button>
              </div>
            </div>
          )}
        </div>

        {savedResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Saved Results</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Parameters</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {savedResults.map((saved) => (
                    <tr key={saved.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {saved.timestamp}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div>u: {saved.values.u}</div>
                        <div>dom: {saved.values.dom}</div>
                        <div>fc: {saved.values.fc}</div>
                        <div>σcp: {saved.values.sigmacp}</div>
                        <div>βh: {saved.values.betah}</div>
                        <div>Reinforced: {saved.values.hasShearReinforcement ? 'Yes' : 'No'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {saved.result.toFixed(2)} N
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handleDeleteResult(saved.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;