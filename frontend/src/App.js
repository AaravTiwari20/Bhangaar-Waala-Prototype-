import React, { useState, useEffect } from 'react';
import { Calendar, MapPin, Trash2, Users, BarChart3, MessageCircle, Bell, Star, Plus, Check, Clock, Truck, AlertCircle, Filter, Search, Phone, Mail, MapPin as MapPinIcon, Camera, Send, User, Settings, LogOut, Home, Package, Award, History } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Textarea } from './components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Badge } from './components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Avatar, AvatarFallback } from './components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './components/ui/dialog';
import { Alert, AlertDescription } from './components/ui/alert';
import './App.css';

const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [pickups, setPickups] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auth functions
  const handleAuth = async (userData, isLogin = false) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/${isLogin ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setCurrentUser(data.user);
        setCurrentView('dashboard');
        setSuccess(isLogin ? 'Login successful!' : 'Registration successful!');
      } else {
        setError(data.detail || 'Authentication failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setCurrentUser(null);
    setCurrentView('login');
  };

  // Data fetching functions
  const fetchPickups = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/pickups`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setPickups(data);
      }
    } catch (err) {
      console.error('Error fetching pickups:', err);
    }
  };

  const fetchStats = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/stats/user`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const createPickup = async (pickupData) => {
    const token = localStorage.getItem('token');
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/pickups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(pickupData)
      });
      
      if (response.ok) {
        setSuccess('Pickup request created successfully!');
        fetchPickups();
        setCurrentView('dashboard');
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to create pickup');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const updatePickupStatus = async (pickupId, status) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/pickups/${pickupId}/status?status=${status}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setSuccess('Status updated successfully!');
        fetchPickups();
      }
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const assignPickup = async (pickupId) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/api/pickups/${pickupId}/assign`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        setSuccess('Pickup assigned successfully!');
        fetchPickups();
      }
    } catch (err) {
      setError('Failed to assign pickup');
    }
  };

  // Initialize app
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (token && user) {
      setCurrentUser(JSON.parse(user));
      setCurrentView('dashboard');
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchPickups();
      fetchStats();
    }
  }, [currentUser]);

  // Clear messages after 3 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Login/Register Component
  const AuthComponent = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [formData, setFormData] = useState({
      email: '',
      password: '',
      name: '',
      phone: '',
      role: 'household',
      address: ''
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      handleAuth(formData, isLogin);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto bg-green-600 rounded-full p-3 w-16 h-16 flex items-center justify-center">
              <Trash2 className="text-white h-8 w-8" />
            </div>
            <CardTitle className="text-2xl font-bold text-green-800">Bhangaar Waala</CardTitle>
            <p className="text-gray-600">Smart Waste Management Solution</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <Input
                    type="text"
                    placeholder="Full Name"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required={!isLogin}
                  />
                  <Input
                    type="tel"
                    placeholder="Phone Number"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required={!isLogin}
                  />
                  <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="household">Household User</SelectItem>
                      <SelectItem value="collector">Waste Collector</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea
                    placeholder="Address (Optional)"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </>
              )}
              <Input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={loading}>
                {loading ? 'Loading...' : (isLogin ? 'Login' : 'Register')}
              </Button>
            </form>
            <div className="text-center mt-4">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-green-600 hover:text-green-800 text-sm"
              >
                {isLogin ? "Don't have an account? Register" : "Already have an account? Login"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Schedule Pickup Component
  const SchedulePickup = () => {
    const [formData, setFormData] = useState({
      waste_type: '',
      pickup_date: '',
      pickup_time: '',
      location: '',
      address: '',
      notes: ''
    });

    const wasteTypes = [
      { value: 'dry', label: 'Dry Waste', points: 10, icon: '🗞️' },
      { value: 'wet', label: 'Wet Waste', points: 5, icon: '🍎' },
      { value: 'electronic', label: 'Electronic Waste', points: 25, icon: '📱' },
      { value: 'medical', label: 'Medical Waste', points: 20, icon: '💊' },
      { value: 'recyclable', label: 'Recyclable Waste', points: 15, icon: '♻️' }
    ];

    const handleSubmit = (e) => {
      e.preventDefault();
      const pickupDateTime = new Date(`${formData.pickup_date}T${formData.pickup_time}`);
      createPickup({
        ...formData,
        pickup_date: pickupDateTime.toISOString()
      });
    };

    return (
      <div className="max-w-2xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-green-600" />
              Schedule Waste Pickup
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Waste Type</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {wasteTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                        formData.waste_type === type.value 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-200 hover:border-green-300'
                      }`}
                      onClick={() => setFormData({...formData, waste_type: type.value})}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{type.icon}</span>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-gray-500">{type.points} EcoPoints</div>
                          </div>
                        </div>
                        {formData.waste_type === type.value && (
                          <Check className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Pickup Date</label>
                  <Input
                    type="date"
                    value={formData.pickup_date}
                    onChange={(e) => setFormData({...formData, pickup_date: e.target.value})}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Pickup Time</label>
                  <Input
                    type="time"
                    value={formData.pickup_time}
                    onChange={(e) => setFormData({...formData, pickup_time: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Location</label>
                <Input
                  type="text"
                  placeholder="Enter your location coordinates or use GPS"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Complete Address</label>
                <Textarea
                  placeholder="Enter your complete address for pickup"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Additional Notes (Optional)</label>
                <Textarea
                  placeholder="Any special instructions for the collector"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                />
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCurrentView('dashboard')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  disabled={loading}
                >
                  {loading ? 'Scheduling...' : 'Schedule Pickup'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Dashboard Component
  const Dashboard = () => {
    const getStatusIcon = (status) => {
      switch (status) {
        case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
        case 'assigned': return <User className="h-4 w-4 text-blue-500" />;
        case 'on_the_way': return <Truck className="h-4 w-4 text-purple-500" />;
        case 'collected': return <Check className="h-4 w-4 text-green-500" />;
        case 'failed': return <AlertCircle className="h-4 w-4 text-red-500" />;
        default: return <Clock className="h-4 w-4 text-gray-500" />;
      }
    };

    const getStatusText = (status) => {
      switch (status) {
        case 'pending': return 'Pending Assignment';
        case 'assigned': return 'Assigned to Collector';
        case 'on_the_way': return 'Collector On The Way';
        case 'collected': return 'Successfully Collected';
        case 'failed': return 'Collection Failed';
        default: return status;
      }
    };

    const getWasteIcon = (type) => {
      switch (type) {
        case 'dry': return '🗞️';
        case 'wet': return '🍎';
        case 'electronic': return '📱';
        case 'medical': return '💊';
        case 'recyclable': return '♻️';
        default: return '🗑️';
      }
    };

    if (currentUser?.role === 'household') {
      return (
        <div className="p-4 max-w-6xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100">EcoPoints</p>
                    <p className="text-3xl font-bold">{stats.eco_points || 0}</p>
                  </div>
                  <Award className="h-8 w-8 text-green-200" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Total Pickups</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_pickups || 0}</p>
                  </div>
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{stats.completed_pickups || 0}</p>
                  </div>
                  <Check className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Pending</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.pending_pickups || 0}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button
                onClick={() => setCurrentView('schedule')}
                className="h-20 bg-green-600 hover:bg-green-700 flex-col gap-2"
              >
                <Plus className="h-6 w-6" />
                Schedule Pickup
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <MapPinIcon className="h-6 w-6" />
                Track Pickup
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <History className="h-6 w-6" />
                View History
              </Button>
              <Button variant="outline" className="h-20 flex-col gap-2">
                <MessageCircle className="h-6 w-6" />
                Chat Support
              </Button>
            </div>
          </div>

          {/* Recent Pickups */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Recent Pickups
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pickups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No pickups scheduled yet</p>
                  <Button 
                    onClick={() => setCurrentView('schedule')} 
                    className="mt-4 bg-green-600 hover:bg-green-700"
                  >
                    Schedule Your First Pickup
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {pickups.slice(0, 5).map((pickup) => (
                    <div key={pickup.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">{getWasteIcon(pickup.waste_type)}</div>
                        <div>
                          <p className="font-medium capitalize">{pickup.waste_type} Waste</p>
                          <p className="text-sm text-gray-600">
                            {new Date(pickup.pickup_date).toLocaleDateString()} at {pickup.pickup_time}
                          </p>
                          <p className="text-sm text-gray-500">{pickup.address}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={pickup.status === 'collected' ? 'default' : 'secondary'}
                          className="flex items-center gap-1"
                        >
                          {getStatusIcon(pickup.status)}
                          {getStatusText(pickup.status)}
                        </Badge>
                        {pickup.collector && (
                          <p className="text-sm text-gray-500 mt-1">
                            Collector: {pickup.collector.name}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    if (currentUser?.role === 'collector') {
      const availablePickups = pickups.filter(p => p.status === 'pending');
      const myPickups = pickups.filter(p => p.collector_id === currentUser.id);

      return (
        <div className="p-4 max-w-6xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Available Pickups</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.pending_assignments || 0}</p>
                  </div>
                  <Bell className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Total Pickups</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_pickups || 0}</p>
                  </div>
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Completed</p>
                    <p className="text-3xl font-bold text-green-600">{stats.completed_pickups || 0}</p>
                  </div>
                  <Check className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600">Rating</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.average_rating || 0}</p>
                  </div>
                  <Star className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs for Available and My Pickups */}
          <Tabs defaultValue="available" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="available">Available Pickups ({availablePickups.length})</TabsTrigger>
              <TabsTrigger value="assigned">My Pickups ({myPickups.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="available">
              <Card>
                <CardHeader>
                  <CardTitle>Available Pickups</CardTitle>
                </CardHeader>
                <CardContent>
                  {availablePickups.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No available pickups at the moment</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {availablePickups.map((pickup) => (
                        <div key={pickup.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="text-3xl">{getWasteIcon(pickup.waste_type)}</div>
                              <div>
                                <p className="font-medium capitalize">{pickup.waste_type} Waste</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(pickup.pickup_date).toLocaleDateString()} at {pickup.pickup_time}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                  <MapPinIcon className="h-3 w-3" />
                                  {pickup.address}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  Customer: {pickup.user?.name}
                                </p>
                                {pickup.notes && (
                                  <p className="text-sm text-gray-600 mt-1 bg-gray-50 p-2 rounded">
                                    Note: {pickup.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Button
                              onClick={() => assignPickup(pickup.id)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Accept Pickup
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assigned">
              <Card>
                <CardHeader>
                  <CardTitle>My Assigned Pickups</CardTitle>
                </CardHeader>
                <CardContent>
                  {myPickups.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No assigned pickups</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {myPickups.map((pickup) => (
                        <div key={pickup.id} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className="text-3xl">{getWasteIcon(pickup.waste_type)}</div>
                              <div>
                                <p className="font-medium capitalize">{pickup.waste_type} Waste</p>
                                <p className="text-sm text-gray-600">
                                  {new Date(pickup.pickup_date).toLocaleDateString()} at {pickup.pickup_time}
                                </p>
                                <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                                  <MapPinIcon className="h-3 w-3" />
                                  {pickup.address}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                  Customer: {pickup.user?.name} - {pickup.user?.phone}
                                </p>
                                <Badge 
                                  variant={pickup.status === 'collected' ? 'default' : 'secondary'}
                                  className="flex items-center gap-1 w-fit mt-2"
                                >
                                  {getStatusIcon(pickup.status)}
                                  {getStatusText(pickup.status)}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {pickup.status === 'assigned' && (
                                <Button
                                  onClick={() => updatePickupStatus(pickup.id, 'on_the_way')}
                                  className="bg-blue-600 hover:bg-blue-700"
                                >
                                  Start Journey
                                </Button>
                              )}
                              {pickup.status === 'on_the_way' && (
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => updatePickupStatus(pickup.id, 'collected')}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Mark Collected
                                  </Button>
                                  <Button
                                    onClick={() => updatePickupStatus(pickup.id, 'failed')}
                                    variant="outline"
                                    className="border-red-300 text-red-600 hover:bg-red-50"
                                  >
                                    Mark Failed
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    // Admin Dashboard
    return (
      <div className="p-4 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100">Total Users</p>
                  <p className="text-3xl font-bold">{stats.total_users || 0}</p>
                </div>
                <Users className="h-8 w-8 text-blue-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100">Collectors</p>
                  <p className="text-3xl font-bold">{stats.total_collectors || 0}</p>
                </div>
                <Truck className="h-8 w-8 text-purple-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100">Total Pickups</p>
                  <p className="text-3xl font-bold">{stats.total_pickups || 0}</p>
                </div>
                <Package className="h-8 w-8 text-green-200" />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100">Completion Rate</p>
                  <p className="text-3xl font-bold">{stats.completion_rate || 0}%</p>
                </div>
                <BarChart3 className="h-8 w-8 text-yellow-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent System Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pickups.slice(0, 10).map((pickup) => (
                <div key={pickup.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{getWasteIcon(pickup.waste_type)}</div>
                    <div>
                      <p className="font-medium">
                        {pickup.user?.name} - {pickup.waste_type} waste pickup
                      </p>
                      <p className="text-sm text-gray-600">
                        {new Date(pickup.pickup_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={pickup.status === 'collected' ? 'default' : 'secondary'}
                    className="flex items-center gap-1"
                  >
                    {getStatusIcon(pickup.status)}
                    {getStatusText(pickup.status)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Navigation Component
  const Navigation = () => {
    if (!currentUser) return null;

    const navItems = {
      household: [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'schedule', label: 'Schedule', icon: Plus },
        { id: 'history', label: 'History', icon: History },
        { id: 'profile', label: 'Profile', icon: User }
      ],
      collector: [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'pickups', label: 'Pickups', icon: Package },
        { id: 'stats', label: 'Stats', icon: BarChart3 },
        { id: 'profile', label: 'Profile', icon: User }
      ],
      admin: [
        { id: 'dashboard', label: 'Dashboard', icon: Home },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    };

    return (
      <nav className="bg-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="bg-green-600 rounded-full p-2">
                <Trash2 className="text-white h-6 w-6" />
              </div>
              <span className="text-xl font-bold text-green-800">Bhangaar Waala</span>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              {navItems[currentUser.role]?.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentView(item.id === 'pickups' ? 'dashboard' : item.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                      currentView === item.id || (item.id === 'pickups' && currentView === 'dashboard')
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:text-green-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium">{currentUser.name}</p>
                <p className="text-xs text-gray-500 capitalize">{currentUser.role}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>
    );
  };

  // Mobile Navigation
  const MobileNav = () => {
    if (!currentUser) return null;

    const navItems = {
      household: [
        { id: 'dashboard', label: 'Home', icon: Home },
        { id: 'schedule', label: 'Schedule', icon: Plus },
        { id: 'history', label: 'History', icon: History },
        { id: 'profile', label: 'Profile', icon: User }
      ],
      collector: [
        { id: 'dashboard', label: 'Home', icon: Home },
        { id: 'pickups', label: 'Pickups', icon: Package },
        { id: 'stats', label: 'Stats', icon: BarChart3 },
        { id: 'profile', label: 'Profile', icon: User }
      ],
      admin: [
        { id: 'dashboard', label: 'Home', icon: Home },
        { id: 'users', label: 'Users', icon: Users },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    };

    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg">
        <div className="flex items-center justify-around py-2">
          {navItems[currentUser.role]?.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id === 'pickups' ? 'dashboard' : item.id)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
                  currentView === item.id || (item.id === 'pickups' && currentView === 'dashboard')
                    ? 'text-green-600'
                    : 'text-gray-600'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // Main App Render
  if (!currentUser) {
    return <AuthComponent />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      {/* Alert Messages */}
      {error && (
        <Alert className="mx-4 mt-4 border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}
      
      {success && (
        <Alert className="mx-4 mt-4 border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">{success}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <main className="pb-20 md:pb-4">
        {currentView === 'login' && <AuthComponent />}
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'schedule' && currentUser.role === 'household' && <SchedulePickup />}
        {/* Add other views here as needed */}
      </main>

      <MobileNav />
    </div>
  );
}

export default App;