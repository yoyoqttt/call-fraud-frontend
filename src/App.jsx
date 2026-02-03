 import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { 
  Mic, Upload, Trash2, History, BarChart3, 
  AlertTriangle, CheckCircle, XCircle, Loader2,
  Download, Play, Pause, StopCircle
} from 'lucide-react';
import './App.css';

// API base URL
const API_URL = 'http://localhost:8000';

function App() {
  // State management
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' or 'record'

  // References
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load history and stats on mount
  useEffect(() => {
    fetchHistory();
    fetchStats();
  }, []);

  // Timer for recording
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
        await processLiveRecording(audioBlob);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setResult(null);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Error accessing microphone. Please check permissions.');
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  // Resume recording
  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  // Process live recording
  const processLiveRecording = async (audioBlob) => {
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.mp3');

      const response = await axios.post(`${API_URL}/process-live-recording`, formData);

      setResult(response.data);
      await fetchHistory();
      await fetchStats();
    } catch (error) {
      console.error('Error processing recording:', error.response?.data || error);
      alert('Error processing recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsProcessing(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post(`${API_URL}/upload-audio`, formData);

      setResult(response.data);
      await fetchHistory();
      await fetchStats();
    } catch (error) {
      console.error('Error uploading file:', error.response?.data || error);
      alert('Error uploading file. Please check the file format and try again.');
    } finally {
      setIsProcessing(false);
      event.target.value = ''; // Reset file input
    }
  };

  // Fetch history
  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_URL}/get-history`);
      setHistory(response.data.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Clear history
  const clearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all history?')) return;

    try {
      await axios.delete(`${API_URL}/clear-history`);
      setHistory([]);
      await fetchStats();
      alert('History cleared successfully!');
    } catch (error) {
      console.error('Error clearing history:', error);
      alert('Error clearing history.');
    }
  };

  // Train model
  const trainModel = async () => {
    setIsProcessing(true);
    try {
      const response = await axios.post(`${API_URL}/train-model`);
      alert(`Model trained successfully!\nAccuracy: ${(response.data.metrics.accuracy * 100).toFixed(2)}%`);
      await fetchStats();
    } catch (error) {
      console.error('Error training model:', error);
      alert('Error training model.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset current analysis
  const resetAnalysis = () => {
    setResult(null);
    setRecordingTime(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">yoyoqttt</h1>
                <p className="text-sm text-gray-600">AI-Powered Call Analysis System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
              >
                <History className="w-5 h-5" />
                <span>History</span>
              </button>
              <button
                onClick={trainModel}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                disabled={isProcessing}
              >
                <BarChart3 className="w-5 h-5" />
                <span>Train Model</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Audio Files</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.audio_files}</p>
                </div>
                <Upload className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Transcripts</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.transcripts}</p>
                </div>
                <Download className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">History</p>
                  <p className="text-2xl font-bold text-gray-800">{stats.history_records}</p>
                </div>
                <History className="w-8 h-8 text-purple-500" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Model Status</p>
                  <p className="text-sm font-bold text-green-600">
                    {stats.model_trained ? 'Trained' : 'Not Trained'}
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-orange-500" />
              </div>
            </div>
          </div>
        )}

        {/* History Panel */}
        {showHistory && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Detection History</h2>
              <button
                onClick={clearHistory}
                className="flex items-center space-x-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            </div>
            
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No history available</p>
              ) : (
                history.slice().reverse().map((item, index) => {
                  const fd = item.fraud_detection;
                  const transcriptPreview = item.transcript && item.transcript.length > 0 ? item.transcript.substring(0, 100) + '...' : (item.transcription_error || 'No transcript available');

                  return (
                    <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {fd ? (
                              fd.is_fraud ? (
                                <XCircle className="w-5 h-5 text-red-500" />
                              ) : (
                                <CheckCircle className="w-5 h-5 text-green-500" />
                              )
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-yellow-500" />
                            )}

                            <span className="font-semibold">
                              {fd ? (fd.is_fraud ? 'FRAUD DETECTED' : 'LEGITIMATE') : 'TRANSCRIPTION FAILED'}
                            </span>

                            {fd ? (
                              <span className={`px-2 py-1 rounded text-xs font-bold ${
                                fd.risk_level === 'HIGH' ? 'bg-red-100 text-red-800' :
                                fd.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {fd.risk_level}
                              </span>
                            ) : null}
                          </div>

                          <p className="text-sm text-gray-600 mb-2">
                            {transcriptPreview}
                          </p>

                          <p className="text-xs text-gray-500">
                            {item.filename} • {new Date(item.timestamp).toLocaleString()}
                          </p>
                        </div>

                        <div className="text-right">
                          {fd ? (
                            <>
                              <p className="text-sm font-bold text-gray-800">
                                {(fd.confidence * 100).toFixed(1)}%
                              </p>
                              <p className="text-xs text-gray-500">Confidence</p>
                            </>
                          ) : (
                            <p className="text-sm font-medium text-gray-600">—</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Main Analysis Panel */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Tabs */}
          <div className="flex space-x-4 mb-6 border-b">
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-3 px-4 font-semibold transition ${
                activeTab === 'upload'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Upload Audio
            </button>
            <button
              onClick={() => setActiveTab('record')}
              className={`pb-3 px-4 font-semibold transition ${
                activeTab === 'record'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Live Recording
            </button>
          </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition"
              >
                <Upload className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Upload Audio File
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  Click to browse or drag and drop
                </p>
                <p className="text-xs text-gray-400">
                  Supported formats: MP3, WAV, FLAC, M4A
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.wav,.flac,.m4a"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* Recording Tab */}
          {activeTab === 'record' && (
            <div className="space-y-6">
              <div className="text-center">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto hover:from-red-600 hover:to-red-700 transition shadow-lg"
                    disabled={isProcessing}
                  >
                    <Mic className="w-12 h-12 text-white" />
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="text-4xl font-bold text-gray-800">
                      {formatTime(recordingTime)}
                    </div>
                    <div className="flex items-center justify-center space-x-4">
                      {!isPaused ? (
                        <button
                          onClick={pauseRecording}
                          className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center hover:bg-yellow-600 transition shadow-lg"
                        >
                          <Pause className="w-8 h-8 text-white" />
                        </button>
                      ) : (
                        <button
                          onClick={resumeRecording}
                          className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-600 transition shadow-lg"
                        >
                          <Play className="w-8 h-8 text-white" />
                        </button>
                      )}
                      <button
                        onClick={stopRecording}
                        className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition shadow-lg"
                      >
                        <StopCircle className="w-8 h-8 text-white" />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600">
                      {isPaused ? 'Recording paused' : 'Recording in progress...'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="mt-8 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 text-indigo-600 animate-spin" />
              <p className="text-lg font-semibold text-gray-700">
                Processing your audio...
              </p>
              <p className="text-sm text-gray-500">
                This may take a few moments
              </p>
            </div>
          )}

          {/* Results */}
          {result && !isProcessing && (
            <div className="mt-8 space-y-6">
              {/* Fraud Status Card */}
              <div className={`rounded-lg p-6 ${
                result.fraud_detection.is_fraud
                  ? 'bg-red-50 border-2 border-red-200'
                  : 'bg-green-50 border-2 border-green-200'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    {result.fraud_detection.is_fraud ? (
                      <XCircle className="w-12 h-12 text-red-600 flex-shrink-0" />
                    ) : (
                      <CheckCircle className="w-12 h-12 text-green-600 flex-shrink-0" />
                    )}
                    <div>
                      <h3 className="text-2xl font-bold mb-2">
                        {result.fraud_detection.is_fraud ? 'FRAUD DETECTED' : 'CALL IS LEGITIMATE'}
                      </h3>
                      <p className="text-gray-700 mb-2">
                        Confidence: <span className="font-bold">
                          {(result.fraud_detection.confidence * 100).toFixed(2)}%
                        </span>
                      </p>
                      <p className="text-gray-700">
                        Risk Level: <span className={`font-bold px-3 py-1 rounded ${
                          result.fraud_detection.risk_level === 'HIGH' ? 'bg-red-200 text-red-800' :
                          result.fraud_detection.risk_level === 'MEDIUM' ? 'bg-yellow-200 text-yellow-800' :
                          'bg-green-200 text-green-800'
                        }`}>
                          {result.fraud_detection.risk_level}
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Fraud Indicators */}
                {result.fraud_detection.fraud_indicators && result.fraud_detection.fraud_indicators.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-300">
                    <h4 className="font-semibold text-gray-800 mb-2">Fraud Indicators Found:</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.fraud_detection.fraud_indicators.map((indicator, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-white rounded-full text-sm text-gray-700 border border-gray-300"
                        >
                          {indicator}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Transcript */}
              <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Full Transcript:</h4>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {result.transcript}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-center space-x-4">
                <button
                  onClick={resetAnalysis}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-semibold"
                >
                  Analyze Another Call
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white mt-12 py-6 border-t">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>Fraud Call Detection System • AI-Powered Analysis</p>
          <p className="text-sm mt-1">yoyoqttt</p>
        </div>
      </footer>
    </div>
  );
}

export default App;