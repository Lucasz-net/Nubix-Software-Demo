import { ShieldCheck } from "lucide-react";
import { useStore } from "../store/useStore";
import Modal from "./Modal";
import PinPad from "./PinPad";

interface Props {
  action: string; // qué se está autorizando, ej: "Registrar un egreso de $5.000"
  onClose: () => void;
  onAuthorized: (ownerId: string) => void;
}

// Pide el PIN de un dueño para que un cajero pueda hacer algo que no tiene permitido.
export default function OwnerPinModal({ action, onClose, onAuthorized }: Props) {
  const owners = useStore((s) => s.users).filter((u) => u.role === "admin");

  return (
    <Modal title="Autorización del dueño" subtitle={action} onClose={onClose}>
      <div className="flex flex-col items-center">
        <span className="icon-tile mb-3 h-14 w-14 bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-lg">
          <ShieldCheck size={26} />
        </span>
        <p className="mb-5 text-center text-sm text-slate-500">
          Esta operación necesita el PIN del dueño.
          <br />
          <span className="text-xs text-slate-400">PIN demo: {owners[0]?.pin}</span>
        </p>
        <PinPad
          onComplete={(pin) => {
            const owner = owners.find((u) => u.pin === pin);
            if (!owner) return false;
            onAuthorized(owner.id);
            return true;
          }}
        />
      </div>
    </Modal>
  );
}
