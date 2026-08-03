export default function LoadingSpinner({ text = 'লোড হচ্ছে...' }) {
  return (
    <div className="loading-page">
      <div className="spinner"></div>
      <p className="loading-page-text">{text}</p>
    </div>
  );
}
