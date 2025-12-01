dest=$1
path=""

pwd
echo "Destination is $dest"
copy_address=true

if [ $dest = "frontend" ]; then
  path="/Users/riskyworks/Documents/web/techcode_turbo/apps/aynn-marketplace/src/contracts/include"
  copy_address=true
elif [ $dest = "backend" ]; then
  path="/Users/riskyworks/Documents/web/techcode_net/apps/AYNN.Application/AYNN.Application/Private/app/smartContracts"
  copy_address=false
else
  echo "Destination not supported..."
fi

echo "Final path is $path"

rm -rf $path/*

if [ "$copy_address" = true ]; then
  rsync -ahPz --delete --compress build/* $path
else
  rsync -ahPz --delete --compress --exclude '*-address.json' build/* $path
fi

rsync -ahPz --compress flatten/* $path
