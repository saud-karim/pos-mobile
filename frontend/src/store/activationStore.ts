import { create } from 'zustand';
import CryptoJS from 'crypto-js';

const SECRET_KEY = "POS_MOBILE_SECRET_KEY_2026"; // Must match Laravel
const ACTIVATION_STORAGE_KEY = 'pos_activation_code';

interface ActivationPayload {
  hwid: string;
  exp: number | null; // null for lifetime, timestamp for expiration
}

interface ActivationState {
  isActivated: boolean;
  isChecking: boolean;
  hardwareId: string | null;
  error: string | null;
  checkActivation: (hwid: string) => void;
  activate: (hwid: string, code: string) => boolean;
}

export const useActivationStore = create<ActivationState>((set, get) => ({
  isActivated: false,
  isChecking: true,
  hardwareId: null,
  error: null,

  checkActivation: (hwid: string) => {
    set({ hardwareId: hwid, isChecking: true });
    try {
      const code = localStorage.getItem(ACTIVATION_STORAGE_KEY);
      if (!code) {
        set({ isActivated: false, isChecking: false });
        return;
      }

      // Decrypt
      const bytes = CryptoJS.AES.decrypt(code, SECRET_KEY);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        throw new Error("Invalid Code");
      }

      const payload: ActivationPayload = JSON.parse(decryptedData);

      // Check Hardware ID
      if (payload.hwid !== hwid) {
        set({ isActivated: false, isChecking: false, error: "كود التفعيل لا يطابق بصمة هذا الجهاز" });
        return;
      }

      // Check Expiration
      if (payload.exp !== null) {
        const now = Date.now();
        if (now > payload.exp) {
          set({ isActivated: false, isChecking: false, error: "كود التفعيل منتهي الصلاحية" });
          return;
        }
      }

      // Valid
      set({ isActivated: true, isChecking: false, error: null });
    } catch (err) {
      set({ isActivated: false, isChecking: false, error: "كود التفعيل غير صالح أو تالف" });
    }
  },

  activate: (hwid: string, code: string) => {
    try {
      const bytes = CryptoJS.AES.decrypt(code, SECRET_KEY);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        set({ error: "كود التفعيل غير صالح" });
        return false;
      }

      const payload: ActivationPayload = JSON.parse(decryptedData);

      if (payload.hwid !== hwid) {
        set({ error: "الكود لا يتطابق مع بصمة هذا الجهاز" });
        return false;
      }

      if (payload.exp !== null) {
        if (Date.now() > payload.exp) {
          set({ error: "كود التفعيل منتهي الصلاحية" });
          return false;
        }
      }

      // Success
      localStorage.setItem(ACTIVATION_STORAGE_KEY, code);
      set({ isActivated: true, error: null });
      return true;
    } catch (err) {
      set({ error: "كود التفعيل غير صالح" });
      return false;
    }
  }
}));
