import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';

function AudioMergeApp() {
  const [csvData, setCsvData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [selectedName, setSelectedName] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [baseFiles, setBaseFiles] = useState({});
  const [cityRecordings, setCityRecordings] = useState({});
  const [nameRecordings, setNameRecordings] = useState({});
  const [ownerIndex, setOwnerIndex] = useState(0);
  const [mergedIndexes, setMergedIndexes] = useState(new Set());
  const [recentMerged, setRecentMerged] = useState([]);
  const mediaRecorderRef = useRef(null);
  const [recordingType, setRecordingType] = useState('');

  const handleCsvUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function (results) {
        const cleanedData = results.data.map(row => {
          const cleanedRow = {};
          Object.keys(row).forEach(key => {
            if (key) cleanedRow[key.trim()] = row[key];
          });
          return cleanedRow;
        });

        const normalizedHeaders = Object.keys(cleanedData[0] || {}).map(h => h.trim());

        setCsvData(cleanedData);
        setHeaders(normalizedHeaders);
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

        const currentRow = csvData[ownerIndex];
        const name = currentRow[selectedName];
        const city = currentRow[selectedCity];

        if (type === 'city') {
          setCityRecordings(prev => ({ ...prev, [city]: blob }));
        }

        if (type === 'name') {
          setNameRecordings(prev => ({ ...prev, [name]: blob }));
        }

        setRecordingType('');

        const nameReady = type === 'name' || !!nameRecordings[name];
        const cityReady = type === 'city' || !!cityRecordings[city];
        if (nameReady && cityReady) {
          handleMerge();
        }
      };

      mediaRecorder.start();
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  };

  const isNameRecorded = () => {
    const row = csvData[ownerIndex];
    if (!row) return false;
    return !!nameRecordings[row[selectedName]];
  };

  const isCityRecorded = () => {
    const row = csvData[ownerIndex];
    if (!row) return false;
    return !!cityRecordings[row[selectedCity]];
  };

  const handleMerge = async () => {
    if (mergedIndexes.has(ownerIndex)) return;

    const owner = csvData[ownerIndex];
    const city = owner[selectedCity];
    const name = owner[selectedName];

    const formData = new FormData();
    formData.append('owner_id', ownerIndex);
    formData.append('base_audio', baseFiles['greeting_intro']);
    formData.append('name_audio', nameRecordings[name]);
    formData.append('city_audio', cityRecordings[city]);

    const response = await fetch('https://backend-voicemerge.onrender.com/merge', {
      method: 'POST',
      body: formData,
    });

    const result = await response.json();
    alert(JSON.stringify(result));

    setMergedIndexes(prev => new Set(prev).add(ownerIndex));

    // Add to recent preview log
    if (result.output_file) {
      setRecentMerged(prev => {
        const updated = [result.output_file, ...prev];
        return updated.slice(0, 5);
      });
    }

    setTimeout(() => {
      const next = ownerIndex + 1;
      if (next < csvData.length) {
        setOwnerIndex(next);
      }
    }, 300);
  };

  useEffect(() => {
    const row = csvData[ownerIndex];
    if (!row) return;

    const name = row[selectedName];
    const city = row[selectedCity];

    const nameExists = !!nameRecordings[name];
    const cityExists = !!cityRecordings[city];

    if (nameExists && cityExists && !mergedIndexes.has(ownerIndex)) {
      handleMerge();
    }
  }, [ownerIndex]);

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

          <h3>3. Upload Base Audio File</h3>
          <input type="file" accept=".mp3" onChange={(e) => handleBaseAudioUpload(e, 'greeting_intro')} />

          <h3>✅ Merges Completed: {mergedIndexes.size} / {csvData.length}</h3>
          <p>Now Working On: Owner {ownerIndex + 1} of {csvData.length}</p>

          <h3>4. Record Personalized Audio</h3>
          {csvData[ownerIndex] && (
            <div>
              <p>
                Recording for: <strong>{csvData[ownerIndex][selectedName]}</strong> in <strong>{csvData[ownerIndex][selectedCity]}</strong>
              </p>
              <p>
                Name Recorded: {isNameRecorded() ? '✅' : '❌'} | City Recorded: {isCityRecorded() ? '✅' : '❌'}
              </p>
              {!isNameRecorded() && (
                <button
                  onClick={() =>
                    recordingType === 'name' ? stopRecording() : startRecording('name')
                  }
                  style={{
                    backgroundColor: recordingType === 'name' ? '#e74c3c' : '',
                    color: recordingType === 'name' ? 'white' : '',
                    marginRight: '10px',
                  }}
                >
                  {recordingType === 'name' ? 'Stop Recording Name' : 'Record Name'}
                </button>
              )}
              {!isCityRecorded() && (
                <button
                  onClick={() =>
                    recordingType === 'city' ? stopRecording() : startRecording('city')
                  }
                  style={{
                    backgroundColor: recordingType === 'city' ? '#e74c3c' : '',
                    color: recordingType === 'city' ? 'white' : '',
                  }}
                >
                  {recordingType === 'city' ? 'Stop Recording City' : 'Record City'}
                </button>
              )}
            </div>
          )}

          {recentMerged.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <h3>🎧 Recently Merged Audio</h3>
              {recentMerged.map((url, index) => (
                <div key={index} style={{ marginBottom: '1rem' }}>
                  <p>Merged Output #{mergedIndexes.size - index}</p>
                  <audio controls src={`https://backend-voicemerge.onrender.com/${url}`} />
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AudioMergeApp;
