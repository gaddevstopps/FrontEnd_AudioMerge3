// Replace this URL with your actual backend endpoint on Render once it's deployed
const API_BASE_URL = "https://your-backend-service.onrender.com";

export async function mergeAudio(data) {
  const response = await fetch(`${API_BASE_URL}/merge`, {
    method: 'POST',
    body: data
  });
  return response.json();
}
