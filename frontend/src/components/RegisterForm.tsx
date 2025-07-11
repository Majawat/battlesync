import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { RegisterRequest } from '../types/auth';

interface RegisterFormProps {
  onSwitchToLogin: () => void;
}

export const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register, isLoading, error, clearError } = useAuth();
  const [formData, setFormData] = useState<RegisterRequest>({
    username: '',
    email: '',
    password: '',
  });
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'confirmPassword') {
      setConfirmPassword(value);
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    try {
      await register(formData);
    } catch (error) {
      // Error is handled by the auth context
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-gray-800 shadow-md rounded-lg px-8 pt-6 pb-8 mb-4">
        <div className="mb-6 text-center">
          <h2 className="text-2xl font-bold text-white">Sign Up</h2>
          <p className="text-gray-400 mt-2">Create your BattleSync account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900 border border-red-600 text-red-200 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="username">
              Username
            </label>
            <input
              className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-white bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              id="username"
              type="text"
              name="username"
              placeholder="Choose a username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="email">
              Email (Optional)
            </label>
            <input
              className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-white bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className="mb-4">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-white bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              id="password"
              type="password"
              name="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
            />
          </div>

          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-bold mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              className="shadow appearance-none border border-gray-600 rounded w-full py-2 px-3 text-white bg-gray-700 leading-tight focus:outline-none focus:shadow-outline focus:border-blue-500"
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-50"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-500 hover:text-blue-700 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};