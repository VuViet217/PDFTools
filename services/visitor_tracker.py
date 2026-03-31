"""
Visitor Tracking Service
Theo dõi số lượng người dùng đang truy cập và tổng số lượt truy cập
- Mỗi phiên truy cập (session) chỉ được tính 1 lần
- Tổng truy cập được lưu vào file txt và dồn lũy
"""
import os
from pathlib import Path
from datetime import datetime, timedelta
import threading

STATS_DIR = Path("data")
TOTAL_VISITS_FILE = STATS_DIR / "total_visits.txt"
SESSIONS_FILE = STATS_DIR / "unique_sessions.txt"

class VisitorTracker:
    def __init__(self):
        self.current_visitors = 0
        self.total_visits = 0
        self.visitor_sessions = {}  # Lưu session_id + last access time
        self.unique_sessions = set()  # Lưu các session_id đã được count vào total_visits
        self.lock = threading.Lock()
        self._load_stats()
    
    def _load_stats(self):
        """Tải thống kê từ file"""
        try:
            STATS_DIR.mkdir(exist_ok=True)
            
            # Tải tổng truy cập từ file txt
            if TOTAL_VISITS_FILE.exists():
                with open(TOTAL_VISITS_FILE, 'r', encoding='utf-8') as f:
                    content = f.read().strip()
                    self.total_visits = int(content) if content else 0
            else:
                self.total_visits = 0
                self._save_total_visits()
            
            # Tải unique sessions từ file txt
            if SESSIONS_FILE.exists():
                with open(SESSIONS_FILE, 'r', encoding='utf-8') as f:
                    lines = f.read().strip().split('\n')
                    self.unique_sessions = set(line.strip() for line in lines if line.strip())
        except Exception as e:
            print(f"Error loading stats: {e}")
    
    def _save_total_visits(self):
        """Lưu tổng truy cập vào file txt"""
        try:
            STATS_DIR.mkdir(exist_ok=True)
            with open(TOTAL_VISITS_FILE, 'w', encoding='utf-8') as f:
                f.write(str(self.total_visits))
        except Exception as e:
            print(f"Error saving total visits: {e}")
    
    def _save_unique_sessions(self):
        """Lưu unique sessions vào file txt"""
        try:
            STATS_DIR.mkdir(exist_ok=True)
            with open(SESSIONS_FILE, 'w', encoding='utf-8') as f:
                for session_id in sorted(self.unique_sessions):
                    f.write(session_id + '\n')
        except Exception as e:
            print(f"Error saving sessions: {e}")
    
    def track_visit(self, session_id: str, client_ip: str):
        """
        Track một phiên truy cập duy nhất
        - session_id: định danh duy nhất của phiên (từ cookie)
        - client_ip: địa chỉ IP của client
        """
        with self.lock:
            current_time = datetime.now()
            
            # Nếu session_id mới (chưa được count vào total_visits)
            if session_id not in self.unique_sessions:
                self.total_visits += 1
                self.unique_sessions.add(session_id)
                self._save_unique_sessions()
                self._save_total_visits()
            
            # Cập nhật hoặc thêm session hiện tại
            if session_id not in self.visitor_sessions:
                self.current_visitors += 1
            
            self.visitor_sessions[session_id] = current_time
            
            # Xóa các session cũ hơn 15 phút
            self._cleanup_old_sessions()
    
    def _cleanup_old_sessions(self):
        """Xóa các session đã hết hạn"""
        current_time = datetime.now()
        timeout = timedelta(minutes=15)
        
        expired_sessions = [
            sid for sid, last_time in self.visitor_sessions.items()
            if (current_time - last_time) > timeout
        ]
        
        for sid in expired_sessions:
            del self.visitor_sessions[sid]
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
