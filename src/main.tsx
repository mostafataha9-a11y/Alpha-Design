import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

const rootEl = document.getElementById('root');
if (rootEl) {
  createRoot(rootEl).render(
    <ErrorBoundary
      isRtl={true}
      fallbackTitle="تعذر عرض الواجهة مؤقتاً"
      fallbackMessage="تم احتواء خطأ تقني مفاجئ بنجاح لحماية جلسة العمل. اضغط على «إعادة المحاولة» للعودة فوراً."
    >
      <App />
    </ErrorBoundary>
  );
}
