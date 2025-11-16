-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    route_id VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_price_amount DECIMAL(10, 2) NOT NULL,
    total_price_currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmed_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    
    CONSTRAINT fk_orders_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_orders_status 
        CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
    
    CONSTRAINT chk_orders_price_positive 
        CHECK (total_price_amount >= 0)
);

-- Create order_passengers table
CREATE TABLE IF NOT EXISTS order_passengers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    document_number VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_order_passengers_order_id 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE
);

-- Create order_services table
CREATE TABLE IF NOT EXISTS order_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    service_type VARCHAR(50) NOT NULL,
    service_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    price_amount DECIMAL(10, 2) NOT NULL,
    price_currency VARCHAR(3) NOT NULL DEFAULT 'RUB',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_order_services_order_id 
        FOREIGN KEY (order_id) 
        REFERENCES orders(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_order_services_service_type 
        CHECK (service_type IN ('insurance', 'premium-support')),
    
    CONSTRAINT chk_order_services_price_positive 
        CHECK (price_amount >= 0)
);

-- Create user_preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id UUID PRIMARY KEY,
    notifications_enabled BOOLEAN DEFAULT true NOT NULL,
    language VARCHAR(10) DEFAULT 'ru' NOT NULL,
    theme VARCHAR(20) DEFAULT 'light' NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    CONSTRAINT fk_user_preferences_user_id 
        FOREIGN KEY (user_id) 
        REFERENCES users(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT chk_user_preferences_language 
        CHECK (language IN ('ru', 'en')),
    
    CONSTRAINT chk_user_preferences_theme 
        CHECK (theme IN ('light', 'dark'))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_passengers_order_id ON order_passengers(order_id);
CREATE INDEX IF NOT EXISTS idx_order_services_order_id ON order_services(order_id);
CREATE INDEX IF NOT EXISTS idx_order_services_service_type ON order_services(service_type);



