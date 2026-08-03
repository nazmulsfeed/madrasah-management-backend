import { useState, useEffect } from 'react';
import { MessageSquare, Send, Search, User } from 'lucide-react';

export default function MessagingPage() {
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageText, setMessageText] = useState('');

  const demoChats = [
    { id: 1, name: 'আবুল হাসান (শিক্ষক)', lastMsg: 'ছাত্র আব্দুল্লাহর ব্যাপারে জানাবেন।', time: '১০:৩০', unread: 2 },
    { id: 2, name: 'মোহাম্মদ ইকবাল (অভিভাবক)', lastMsg: 'ধন্যবাদ, বুঝতে পেরেছি।', time: 'গতকাল', unread: 0 },
    { id: 3, name: 'সকল শিক্ষক (গ্রুপ)', lastMsg: 'আগামীকাল মিটিং হবে।', time: 'গতকাল', unread: 5 },
  ];

  const demoMessages = [
    { id: 1, sender: 'other', text: 'আসসালামু আলাইকুম, হুজুর।', time: '১০:২০' },
    { id: 2, sender: 'me', text: 'ওয়া আলাইকুমুস সালাম। বলুন।', time: '১০:২২' },
    { id: 3, sender: 'other', text: 'ছাত্র আব্দুল্লাহর ব্যাপারে জানাবেন। সে আজ স্কুলে আসেনি।', time: '১০:৩০' },
  ];

  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('demoMessages');
    return saved ? JSON.parse(saved) : demoMessages;
  });

  useEffect(() => {
    localStorage.setItem('demoMessages', JSON.stringify(messages));
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    const newMsg = {
      id: Date.now(),
      sender: 'me',
      text: messageText,
      time: new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages([...messages, newMsg]);
    setMessageText('');
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">মেসেজিং</h1>
          <p className="page-subtitle">শিক্ষক, অভিভাবক ও স্টাফদের সাথে সরাসরি যোগাযোগ</p>
        </div>
      </div>

      <div className="card" style={{ display: 'grid', gridTemplateColumns: '320px 1fr', minHeight: '500px', overflow: 'hidden', padding: 0 }}>
        {/* চ্যাট লিস্ট */}
        <div style={{ borderRight: '1px solid var(--border-color)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border-color)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input type="text" className="form-input" placeholder="চ্যাট খুঁজুন..." style={{ paddingLeft: '36px' }} />
            </div>
          </div>
          <div style={{ overflowY: 'auto' }}>
            {demoChats.map((chat) => (
              <div
                key={chat.id}
                onClick={() => setSelectedChat(chat)}
                style={{
                  padding: '16px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)',
                  background: selectedChat?.id === chat.id ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
                  transition: 'background 0.2s',
                }}
              >
                <div className="flex gap-12" style={{ alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <User size={18} style={{ color: 'var(--text-muted)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex-between">
                      <span className="font-semibold text-sm">{chat.name}</span>
                      <span className="text-xs text-muted">{chat.time}</span>
                    </div>
                    <div className="flex-between mt-4">
                      <span className="text-sm text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.lastMsg}</span>
                      {chat.unread > 0 && (
                        <span style={{ background: 'var(--primary)', color: '#fff', fontSize: '0.7rem', padding: '2px 7px', borderRadius: '999px', fontWeight: 600 }}>{chat.unread}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* মেসেজ এরিয়া */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {selectedChat ? (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={16} style={{ color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <div className="font-semibold">{selectedChat.name}</div>
                  <div className="text-xs text-muted">অনলাইন</div>
                </div>
              </div>

              <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg) => (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: msg.sender === 'me' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '70%',
                      padding: '10px 16px',
                      borderRadius: msg.sender === 'me' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: msg.sender === 'me' ? 'var(--primary-600)' : 'var(--bg-secondary)',
                      color: msg.sender === 'me' ? '#fff' : 'var(--text-primary)',
                    }}>
                      <div style={{ fontSize: '0.9rem', lineHeight: 1.5 }}>{msg.text}</div>
                      <div style={{ fontSize: '0.7rem', opacity: 0.7, textAlign: 'right', marginTop: '4px' }}>{msg.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSend} style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '12px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="আপনার মেসেজ লিখুন..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary" disabled={!messageText.trim()}>
                  <Send size={16} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-center" style={{ flex: 1, flexDirection: 'column', gap: '16px' }}>
              <MessageSquare size={48} style={{ opacity: 0.3 }} />
              <p className="text-muted">কথোপকথন শুরু করতে বাম দিক থেকে একটি চ্যাট নির্বাচন করুন</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
