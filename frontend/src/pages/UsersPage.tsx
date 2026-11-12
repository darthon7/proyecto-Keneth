import { Link } from 'react-router-dom';
import { CrudResourcePage } from '@/components/organisms/CrudResourcePage';
import { usersApi } from '@/api';
import type { CreateUserPayload, User } from '@/types';
import type { FieldConfig } from '@/utils/fields';

const fields: FieldConfig[] = [
  { name: 'username', label: 'Nombre de usuario', type: 'text', required: true, maxLength: 100 },
  { name: 'email', label: 'Correo', type: 'email', required: true },
  {
    name: 'password',
    label: 'Contraseña',
    type: 'text',
    required: true,
    minLength: 4,
    maxLength: 50,
    help: 'El backend guarda la contraseña tal cual (4-50 caracteres)',
  },
  { name: 'countryCode', label: 'País (ISO-2)', type: 'text', minLength: 2, maxLength: 2, defaultValue: 'MX' },
  { name: 'isActive', label: 'Cuenta activa', type: 'checkbox', defaultValue: true },
];

export function UsersPage() {
  return (
    <CrudResourcePage<User, CreateUserPayload>
      title="Usuarios"
      description="Cuentas registradas en la tienda. La API no expone autenticación, así que el frontend permite elegir el usuario activo desde la barra superior."
      queryKey={['users']}
      fetchList={() => usersApi.list()}
      createItem={(payload) => usersApi.create(payload)}
      updateItem={(id, payload) => usersApi.update(id, payload)}
      deleteItem={(id) => usersApi.remove(id)}
      fields={fields}
      columns={[
        {
          header: 'Usuario',
          render: (user) => (
            <Link to={`/users/${user.id}`} className="font-semibold text-[#1E1B4B] hover:text-[#FF2A5F]">
              {user.username}
            </Link>
          ),
        },
        { header: 'Correo', className: 'text-fog', render: (user) => user.email },
        { header: 'País', className: 'text-fog', render: (user) => user.countryCode },
        {
          header: 'Estado',
          render: (user) => (
            <span className={user.isActive ? 'font-semibold text-[#065F46]' : 'text-[#94A3B8]'}>
              {user.isActive ? 'Activo' : 'Inactivo'}
            </span>
          ),
        },
        {
          header: 'Órdenes',
          className: 'text-fog',
          render: (user) => String(user.orders?.length ?? 0),
        },
      ]}
      toFormValues={(user) => ({
        username: user.username,
        email: user.email,
        password: user.password,
        countryCode: user.countryCode,
        isActive: user.isActive,
      })}
      getId={(user) => user.id}
    />
  );
}
