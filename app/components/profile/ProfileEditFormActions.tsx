import { Check, X } from "lucide-react";
import { DeleteAccountButton } from "@/app/components/account/DeleteAccount";

interface ProfileEditFormActionsProps {
  editProcessing: boolean;
  onCancel: () => void;
  onSave: () => void;
}

export const ProfileEditFormActions = ({ editProcessing, onCancel, onSave }: ProfileEditFormActionsProps) => {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        <button
          type="button"
          className="btn secondary"
          onClick={onCancel}
          aria-label="Cancel changes"
          style={{ width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={16} />
        </button>
        <button
          type="submit"
          className="btn primary"
          disabled={editProcessing}
          onClick={onSave}
          aria-label={editProcessing ? 'Saving changes' : 'Save changes'}
          style={{ width: 40, height: 40, padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Check size={16} style={{ color: 'var(--text)' }} />
        </button>
      </div>

      <details className="account-options-dropdown">
        <summary className="account-options-summary">Want to Delete Your Account?</summary>
        <div>
          <DeleteAccountButton isEditing={true} />
        </div>
      </details>
    </>
  );
};