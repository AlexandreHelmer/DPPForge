#!/bin/bash

# Apply database migrations
echo "Applying database migrations..."
python manage.py makemigrations && python manage.py migrate

# Create or update superuser and guest user
if [ "$DJANGO_SUPERUSER_USERNAME" ] && [ "$DJANGO_SUPERUSER_PASSWORD" ]; then
    echo "Setting up admin and guest users..."
    python manage.py shell -c "
from django.contrib.auth import get_user_model; 
import os;
User = get_user_model(); 

# Admin
admin_user, _ = User.objects.get_or_create(username='$DJANGO_SUPERUSER_USERNAME', defaults={'email': '$DJANGO_SUPERUSER_EMAIL'});
admin_user.set_password('$DJANGO_SUPERUSER_PASSWORD');
admin_user.is_superuser = True;
admin_user.is_staff = True;
admin_user.is_protected = True;
admin_user.save();
print('Admin user updated/created');

# Guest
guest_pass = os.environ.get('GUEST_PASSWORD');
if guest_pass:
    guest_user, _ = User.objects.get_or_create(username=os.environ.get('GUEST_USERNAME', 'GUEST'), defaults={'email': os.environ.get('GUEST_EMAIL', 'guest@neuralbricks.io')});
    guest_user.set_password(guest_pass);
    guest_user.is_paid = True;
    guest_user.is_active = True;
    guest_user.is_protected = True;
    guest_user.save();
    print('Guest user updated/created');
"
fi

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput

# Start server
echo "Starting server..."
exec gunicorn dpp_project.wsgi:application --bind 0.0.0.0:8000 --access-logfile - --error-logfile -

