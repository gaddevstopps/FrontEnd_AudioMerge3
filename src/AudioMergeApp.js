import React, { useState, useRef } from 'react';
import Papa from 'papaparse';

function AudioMergeApp() {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [selectedName, setSelectedName] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [baseFiles, setBaseFiles] = useState({});
  const [recordings, setRecordings] = useState({});
  const [ownerIndex, setOwnerIndex] = useState(0);
  const mediaRecorderRef = useRef(null);
  const [recordingType, setRecordingType] = useState('');

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        setCsvData(results.data);
        setHeaders(Object.keys(results.data[0] || {}));
      },
    });
  };

  const handleBaseAudioUpload = (e, label) => {
    setBaseFiles(prev => ({ ...prev, [label]: e.target.files[0] }));
  };

  const startRecording = (type) => {
    setRecordingType(type);
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const chunks = [];

      mediaRecorder.ondataavailable = e => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/mp3' });
        setRecordings(prev => ({
          ...prev,
          [type]: blob,
        }));
      };

      mediaRecorder.start();
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const handleMerge = async () => {
    const owner = csvData[ownerIndex];
    const formData = new FormData();
    formData.append('owner_id', ownerIndex);
    formData.append('base_audio', baseFiles['greeting_intro']);
    formData.append('name_audio', recordings['name']);
    formData.append('city_audio', recordings['city']);

  const response = await fetch('https://backend-voicemerge.onrender.com/merge', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    alert(JSON.stringify(result));
  };

  return (
    <div className="container">
      <h1>Personalized Audio Merge</h1>

      <h3>1. Upload CSV</h3>
      <input type="file" accept=".csv" onChange={handleCsvUpload} />

      {headers.length > 0 && (
        <>
          <h3>2. Select Name and City Columns</h3>
          <label>Name Column:</label>
          <select onChange={(e) => setSelectedName(e.target.value)}>
            <option value="">Select</option>
            {headers.map(h => <option key={h}>{h}</option>)}
          </select>
          <label>City Column:</label>
          <select onChange={(e) => setSelectedCity(e.target.value)}>
            <option value="">Select</option>
            {headers.map(h => <option key={h}>{h}</option>)}
          </select>

          <h3>3. Upload Base Audio Files</h3>
          <input type="file" accept=".mp3" onChange={(e) => handleBaseAudioUpload(e, 'greeting_intro')} />
          
          <h3>4. Record Personalized Audio</h3>
          {csvData[ownerIndex] && (
            <div>
              <p>Recording for: <strong>{csvData[ownerIndex][selectedName]}</strong> in <strong>{csvData[ownerIndex][selectedCity]}</strong></p>
              <button onClick={() => startRecording('name')}>Record Name</button>
              <button onClick={() => startRecording('city')}>Record City</button>
              <button onClick={stopRecording}>Stop Recording</button>
            </div>
          )}

          <h3>5. Merge Audio</h3>
          <button onClick={handleMerge}>Merge for Current Owner</button>

          <h3>6. Move to Next</h3>
          <button onClick={() => setOwnerIndex(prev => Math.min(prev + 1, csvData.length - 1))}>Next Owner</button>
        </>
      )}
    </div>
  );
}

export default AudioMergeApp;
