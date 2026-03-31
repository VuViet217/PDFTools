"""
Visitor Tracking Service
Theo dõi số lượng người dùng đang truy cập và tổng số lượt truy cập
"""
import json
import os
from pathlib import Path
from datetime import datetime, timedelta
import threading

STATS_FILE = Path("data/visitor_stats.json")

class VisitorTracker:
    def __init__(self):
        self.current_visitors = 0
        self.total_visits = 0
        self.last_cleanup = datetime.now()
        self.visitor_sessions = {}  # Lưu IP + session time
        self.lock = threading.Lock()
        self._load_stats()
    
    def _load_stats(self):
        """Tải thống kê từ file"""
        try:
            if STATS_FILE.exists():
                with open(STATS_FILE, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.total_visits = data.get('total_visits', 0)
            else:
                self._save_stats()
        except Exception as e:
            print(f"Error loading stats: {e}")
    
    def _save_stats(self):
        """Lưu thống kê vào file"""
        try:
            STATS_FILE.parent.mkdir(exist_ok=True)
            with open(STATS_FILE, 'w', encoding='utf-8') as f:
                json.dump({'total_visits': self.total_visits}, f)
        except Exception as e:
            print(f"Error saving stats: {e}")
    
    def track_visit(self, client_ip: str):
        """Track một người dùng mới"""
        with self.lock:
            # Tăng tổng số truy cập
            self.total_visits += 1
            
            # Kiểm tra xem người dùng này đã online chưa
            current_time = datetime.now()
            if client_ip not in self.visitor_sessions:
                self.current_visitors += 1
                self.visitor_sessions[client_ip] = current_time
            else:
                # Cập nhật thời gian cuối cùng truy cập
                self.visitor_sessions[client_ip] = current_time
            
            # Xóa các session cũ hơn 15 phút
            self._cleanup_old_sessions()
            
            # Lưu lại stats
            self._save_stats()
    
    def _cleanup_old_sessions(self):
        """Xóa các session đã hết hạn"""
        current_time = datetime.now()
        timeout = timedelta(minutes=15)
        
        expired_ips = [
            ip for ip, last_time in self.visitor_sessions.items()
            if (current_time - last_time) > timeout
        ]
        
        for ip in expired_ips:
            del self.visitor_sessions[ip]
            self.current_visitors -= 1
    
    def get_stats(self):
        """Lấy thống kê hiện tại"""
        with self.lock:
            return {
                'current_visitors': self.current_visitors,
                'total_visits': self.total_visits
            }

# Global instance
visitor_tracker = VisitorTracker()
