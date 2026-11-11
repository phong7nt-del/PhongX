import React, { useState } from 'react';
import { MessageSquare, Loader2, Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';

interface AIAdviceProps {
  tonData: any[];
}

export default function AIAdvice({ tonData }: AIAdviceProps) {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    
    // Pick a sample of up to 20 latest/highest debts to give context without hitting token limits
    const sampleData = tonData.slice(0, 20);

    try {
      const res = await fetch('/api/gemini/advice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, tonData: sampleData })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lỗi kết nối tới AI');
      }

      setResponse(data.text);
    } catch (err: any) {
      setError(err.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
        <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600">
          <MessageSquare className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Tư vấn Công nợ bằng AI (Gemini)</h2>
          <p className="text-sm text-gray-500">
            Hỏi AI về chiến lược, cách xử lý nợ khó đòi, kịch bản đàm phán hoặc công việc cần làm.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 relative">
        <div className="relative flex items-center">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Ví dụ: Lên danh sách công việc cần làm cho khách nợ trên 5 triệu..."
            className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-xl focus:ring-indigo-500 focus:border-indigo-500 block p-4 pr-32 shadow-inner"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="absolute right-2 text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-4 focus:outline-none focus:ring-indigo-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {loading ? 'Đang hỏi...' : 'Gửi'}
          </button>
        </div>
      </form>

      {error && (
        <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 border border-red-200">
          {error}
        </div>
      )}

      {response && (
        <div className="bg-indigo-50/50 rounded-xl p-6 border border-indigo-100 prose prose-indigo max-w-none prose-sm sm:prose-base">
          <div className="markdown-body">
            <ReactMarkdown>{response}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
